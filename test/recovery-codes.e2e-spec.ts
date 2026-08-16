import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RecoveryCodesService } from '../src/recovery-codes.service';

describe('RecoveryCodesController', () => {
  let app: INestApplication;
  let recoveryCodesService: RecoveryCodesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    recoveryCodesService = moduleRef.get(RecoveryCodesService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('DTOインスタンスを直接返す経路では復旧コードを出力しない', async () => {
    const response = await request(app.getHttpServer())
      .get('/recovery-codes/rc-17/direct')
      .expect(200);

    expect(response.body).toEqual({
      id: 'rc-17',
      label: '経理部の予備コード',
    });
  });

  it('封筒オブジェクトで返しても復旧コードを出力しない', async () => {
    const response = await request(app.getHttpServer())
      .get('/recovery-codes/rc-17')
      .expect(200);

    expect(response.body).toEqual({
      data: {
        id: 'rc-17',
        label: '経理部の予備コード',
      },
    });

    expect(recoveryCodesService.findById('rc-17')).toEqual({
      id: 'rc-17',
      label: '経理部の予備コード',
      recoveryCode: 'NEVER-SEND-THIS-TO-THE-CLIENT',
    });
  });
});
