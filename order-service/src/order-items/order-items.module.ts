import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderItem } from './entities/order-item.entity';

import { Order } from '../orders/entities/order.entity';

import { OrderItemsController } from './order-items.controller';

import { OrderItemsService } from './order-items.service';

import { ProductsModule } from '../products/products.module';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderItem,
      Order,
    ]),
    ProductsModule,
    AuthModule,
  ],
  controllers: [OrderItemsController],
  providers: [OrderItemsService],
})
export class OrderItemsModule {}