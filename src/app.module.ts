import { Module } from '@nestjs/common';
import { RecoveryCodesController } from './recovery-codes.controller';
import { RecoveryCodesService } from './recovery-codes.service';

@Module({
  controllers: [RecoveryCodesController],
  providers: [RecoveryCodesService],
})
export class AppModule {}
