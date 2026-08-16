# plain objectのラッパーで`@Exclude`が効かない問題のデバッグ記録

## 対象の不具合

`ClassSerializerInterceptor`をコントローラーへ適用し、`RecoveryCodeResponseDto.recoveryCode`へ`@Exclude({ toPlainOnly: true })`を付けていました。それでも、`GET /recovery-codes/rc-17`がDTOを`{ data: ... }`というplain objectで包んで返すと、HTTP 200のJSONに復旧コードが含まれました。復旧コードはサービス内部には保持しつつ、どちらのAPIレスポンスにも出力しないことが契約です。

| 観測点 | 期待値 | バグ状態の実際値 |
| --- | --- | --- |
| `GET /recovery-codes/rc-17/direct` | `id`と`label`のみ | `id`と`label`のみ |
| `GET /recovery-codes/rc-17` | `data.id`と`data.label`のみ | `data.recoveryCode`を含む |
| `RecoveryCodesService.findById('rc-17')` | 復旧コードを内部保持する | 復旧コードを内部保持する |

## 再現条件

バグ状態のコミットは`0ac2e80`です。

```bash
git checkout 0ac2e80
npm ci
npm run test:repro
npm run build
```

焦点化テストは、HTTP 200を確認した後にレスポンス本文全体を検証します。実測した失敗結果は次の通りです。

```text
Expected  - 0
Received  + 1

Object {
  "data": Object {
    "id": "rc-17",
    "label": "経理部の予備コード",
+   "recoveryCode": "NEVER-SEND-THIS-TO-THE-CLIENT",
  },
}
```

同じバグ状態で`npm run build`は成功しました。したがって、問題はTypeScriptの型エラーではなく、実行時に返却する値のプロトタイプとシリアライズ規則の適用範囲です。

## 調査

| 確認対象 | 観測結果 | 判断 |
| --- | --- | --- |
| 入力 | 両経路とも`rc-17`を受け取る | 入力値の差ではない |
| HTTP境界 | 両経路ともHTTP 200。`direct`は安全、封筒経路だけ漏洩 | ステータスだけでは契約を確認できない |
| 内部状態 | リクエスト後もサービスは`recoveryCode`を保持する | データの消失ではなく出力時の除外が対象 |
| インターセプター | コントローラーに`ClassSerializerInterceptor`を設定 | 未設定ではない |
| 返却値 | 安全な経路は`new RecoveryCodeResponseDto(...)`、漏洩経路は`{ data: { ...record } }` | plain objectのラッパー内でDTOインスタンスを失っている |
| 公式仕様 | NestJSはplain JavaScript objectを返すと適切にシリアライズされないと明記 | 直接原因として採用 |

デバッガーは使いませんでした。二つの経路の入力、HTTP応答、サービス状態は同一であり、返却値の構築方法だけを変えた最小比較で結果が反転したためです。さらに、NestJS公式ドキュメントの注意書きがこの観測と一致しました。

## 原因

`ClassSerializerInterceptor`はハンドラーの返却値に対してclass-transformerの`instanceToPlain()`を適用します。[NestJS Serialization](https://docs.nestjs.com/techniques/serialization) しかし、デコレーターは値のTypeScript注釈ではなく、実行時のクラスインスタンスに対して適用されます。バグ状態では次のようにレコードをスプレッドしてplain objectに変換していました。

```ts
return { data: { ...record } as RecoveryCodeResponseDto };
```

`as RecoveryCodeResponseDto`はコンパイラーだけに伝える型アサーションであり、実行時のオブジェクトを`RecoveryCodeResponseDto`のインスタンスにはしません。外側も内側もplain objectとなるため、`@Exclude`のメタデータを適用する対象がなく、`recoveryCode`がJSON化されました。class-transformerもplain objectとclass objectを区別し、`plainToInstance`でplain objectをクラスインスタンスへ変換すると説明しています。[class-transformer README](https://github.com/typestack/class-transformer)

## 修正

修正コミットは`1669c76`です。`RecoveryCodeEnvelopeDto`を追加し、外側と内側を明示的にクラスインスタンスとして返すようにしました。

```ts
return new RecoveryCodeEnvelopeDto({
  data: new RecoveryCodeResponseDto(record),
});
```

これにより、インターセプターはルートの`RecoveryCodeEnvelopeDto`からネストした`RecoveryCodeResponseDto`へ変換を実行し、`recoveryCode`に付与した`@Exclude({ toPlainOnly: true })`をHTTP出力へ反映します。保存済みの値を削除する修正ではないため、内部利用のための復旧コードは保持されます。

## 回帰確認

```bash
git checkout main
npm ci
npm run test:repro
npm test
npm run build
```

実測結果は、焦点化テスト2件成功、全テスト2件成功、TypeScriptビルド成功でした。焦点化テストは、変更対象である封筒経路のレスポンス、保持対象である直接DTO経路のレスポンス、サービスから独立して再読した内部データを確認します。

| ケース | 期待する結果 | 実測結果 |
| --- | --- | --- |
| 直接DTO経路 | 復旧コードを出力しない | 成功 |
| 封筒DTO経路 | 復旧コードを出力しない | 成功 |
| 内部データ | 復旧コードを保持する | 成功 |
| TypeScriptビルド | 本番コードをコンパイルできる | 成功 |

## 設計上の制約

この修正は、`ClassSerializerInterceptor`とclass-transformerを使うHTTPレスポンスの表現に限ります。REST APIで機微情報を防御する最終手段としてDTOシリアライズだけに依存してはいけません。データ取得段階で不要なフィールドを選択しないこと、認可を検証すること、ログ・例外・イベントへ機微情報を書かないことは別の責務です。
