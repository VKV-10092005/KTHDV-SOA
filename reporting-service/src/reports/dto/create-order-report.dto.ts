import { IsInt, Min, IsOptional, IsNumber } from 'class-validator';

export class CreateOrderReportDto {
  @IsInt()
  @Min(1)
  order_id: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_ratio?: number; // Tỷ lệ chi phí/giá bán nếu Product Service chưa có giá nhập (mặc định 0.7)
}
