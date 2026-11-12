import { Module } from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';

import { OrdersModule } from './orders/orders.module';

import { OrderItemsModule } from './order-items/order-items.module';

import { Order } from './orders/entities/order.entity';

import { OrderItem } from './order-items/entities/order-item.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        return {
          type: 'mysql' as const,

          host: configService.getOrThrow<string>(
            'DB_HOST',
          ),

          port: configService.get<number>(
            'DB_PORT',
            3306,
          ),

          username: configService.getOrThrow<string>(
            'DB_USERNAME',
          ),

          password: configService.get<string>(
            'DB_PASSWORD',
            '',
          ),

          database: configService.getOrThrow<string>(
            'DB_DATABASE',
          ),

          entities: [
            Order,
            OrderItem,
          ],

          synchronize: true,

          autoLoadEntities: true,
        };
      },
    }),

    AuthModule,

    OrdersModule,

    OrderItemsModule,
  ],
})
export class AppModule {}