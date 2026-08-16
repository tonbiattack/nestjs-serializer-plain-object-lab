import { Injectable, NotFoundException } from '@nestjs/common';

export type StoredRecoveryCode = {
  id: string;
  label: string;
  recoveryCode: string;
};

@Injectable()
export class RecoveryCodesService {
  private readonly records: StoredRecoveryCode[] = [
    {
      id: 'rc-17',
      label: '経理部の予備コード',
      recoveryCode: 'NEVER-SEND-THIS-TO-THE-CLIENT',
    },
  ];

  findById(id: string): StoredRecoveryCode {
    const record = this.records.find((candidate) => candidate.id === id);

    if (!record) {
      throw new NotFoundException(`Recovery code ${id} was not found`);
    }

    return record;
  }
}
