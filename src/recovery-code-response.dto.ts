import { Exclude } from 'class-transformer';

export class RecoveryCodeResponseDto {
  id!: string;
  label!: string;

  @Exclude({ toPlainOnly: true })
  recoveryCode!: string;

  constructor(partial: RecoveryCodeResponseDto) {
    Object.assign(this, partial);
  }
}
