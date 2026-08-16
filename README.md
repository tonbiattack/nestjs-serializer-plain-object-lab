# NestJS ClassSerializerInterceptor: plain objectで`@Exclude`が漏れる再現

このプロジェクトは、NestJSの`ClassSerializerInterceptor`を有効にしていても、DTOインスタンスをplain objectで包んで返すと`@Exclude`が適用されず、機微な復旧コードがHTTPレスポンスへ漏れる問題を再現します。

## 守るAPI契約

| HTTPリクエスト | 期待するHTTPレスポンス | 内部の保存値 |
| --- | --- | --- |
| `GET /recovery-codes/rc-17/direct` | `id`と`label`のみ | `recoveryCode`を保持する |
| `GET /recovery-codes/rc-17` | `data.id`と`data.label`のみ | `recoveryCode`を保持する |

`RecoveryCodeResponseDto`の`recoveryCode`には`@Exclude({ toPlainOnly: true })`を付けています。バグ状態では、後者だけが`recoveryCode`をHTTPレスポンスへ含めます。NestJSの公式ドキュメントは、`ClassSerializerInterceptor`でデコレーター規則を適用するにはクラスのインスタンスを返す必要があり、plain JavaScript objectを返すと適切にシリアライズされないと説明しています。[NestJS Serialization](https://docs.nestjs.com/techniques/serialization)

## 前提条件

Node.js 22以上とnpmが必要です。依存関係をインストールします。

```bash
npm ci
```

## バグを再現する

バグを含むコミットでは、封筒形式の`GET /recovery-codes/rc-17`だけが失敗します。HTTP 200が返る一方で、レスポンス本文に`recoveryCode`が含まれます。

```bash
git checkout 0ac2e80
npm ci
npm run test:repro
```

実測した失敗結果は[`evidence/bug-test.txt`](./evidence/bug-test.txt)に保存しています。

```text
Expected: data.id と data.label のみ
Received: data.recoveryCode = "NEVER-SEND-THIS-TO-THE-CLIENT"
```

## 最小修正

修正コミットでは、plain objectの`{ data: ... }`を返す代わりに、`RecoveryCodeEnvelopeDto`と`RecoveryCodeResponseDto`をどちらもクラスインスタンスとして構築します。`ClassSerializerInterceptor`は外側のDTOから内側のDTOまで変換し、`@Exclude`を適用できます。

```bash
git checkout 1669c76
npm ci
npm run test:repro
npm test
npm run build
```

修正後の焦点化テスト結果は[`evidence/fixed-test.txt`](./evidence/fixed-test.txt)、全体確認結果は[`evidence/full-verification.txt`](./evidence/full-verification.txt)にあります。

## デバッグ記録

入力、HTTP境界、データソース、実装、公式仕様を分けた観測は[`docs/debugging-record.md`](./docs/debugging-record.md)に記録しています。

## 制約

このサンプルはHTTPレスポンスのシリアライズだけを対象にし、認証・認可、永続化、実際の復旧コード発行は実装しません。実運用では、DTOシリアライズに加えて、そもそも機微なフィールドを取得クエリで選択しないこと、ログや例外応答へ含めないこと、アクセス制御を別層で検証することが必要です。
