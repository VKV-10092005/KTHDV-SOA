import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderReport } from './entities/order-report.entity';
import { ProductReport } from './entities/product-report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExternalModule } from '../external/external.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderReport, ProductReport]),
    ExternalModule,
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
