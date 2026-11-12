import { IsInt, Min, IsOptional, IsNumber } from 'class-validator';

export class CreateProductReportDto {
  @IsInt()
  @Min(1)
  product_id: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order_report_id?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_cost?: number; // Giá nhập đơn vị (nếu muốn truyền tay khi tạo báo cáo)
}
