import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { RecoveryCodeResponseDto } from './recovery-code-response.dto';
import { RecoveryCodesService } from './recovery-codes.service';

@Controller('recovery-codes')
@UseInterceptors(ClassSerializerInterceptor)
export class RecoveryCodesController {
  constructor(private readonly recoveryCodesService: RecoveryCodesService) {}

  @Get(':id/direct')
  findDirect(@Param('id') id: string): RecoveryCodeResponseDto {
    return new RecoveryCodeResponseDto(this.recoveryCodesService.findById(id));
  }

  @Get(':id')
  findOne(@Param('id') id: string): { data: RecoveryCodeResponseDto } {
    const record = this.recoveryCodesService.findById(id);

    return { data: { ...record } as RecoveryCodeResponseDto };
  }
}
