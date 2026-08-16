import { RecoveryCodeResponseDto } from './recovery-code-response.dto';

export class RecoveryCodeEnvelopeDto {
  data!: RecoveryCodeResponseDto;

  constructor(partial: RecoveryCodeEnvelopeDto) {
    Object.assign(this, partial);
  }
}
