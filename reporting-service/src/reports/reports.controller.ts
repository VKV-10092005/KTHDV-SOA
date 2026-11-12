import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateOrderReportDto } from './dto/create-order-report.dto';
import { CreateProductReportDto } from './dto/create-product-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('products')
  findAllProducts(@Req() req: any) {
    return this.reportsService.findAllProductReports(req.accessToken);
  }

  @Get('products/:id')
  findOneProduct(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.reportsService.findOneProductReport(id, req.accessToken);
  }

  @Get('orders')
  findAllOrders() {
    return this.reportsService.findAllOrderReports();
  }

  @Get('orders/:id')
  findOneOrder(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.findOneOrderReport(id);
  }

  @Post('products')
  createProductReport(
    @Body() dto: CreateProductReportDto,
    @Req() req: any,
  ) {
    return this.reportsService.createProductReport(dto, req.accessToken);
  }

  @Post('orders')
  createOrderReport(
    @Body() dto: CreateOrderReportDto,
    @Req() req: any,
  ) {
    return this.reportsService.createOrderReport(dto, req.accessToken);
  }

  @Delete('products/:id')
  removeProductReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.removeProductReport(id);
  }

  @Delete('orders/:id')
  removeOrderReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.removeOrderReport(id);
  }
}
