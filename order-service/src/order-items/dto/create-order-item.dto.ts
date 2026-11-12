import {
  IsInt,
  Min,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  order_id: number;

  @IsInt()
  @Min(1)
  product_id: number;

  @IsInt()
  @Min(1)
  quantity: number;
}