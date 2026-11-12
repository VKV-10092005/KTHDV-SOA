import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { OrderItemsService } from './order-items.service';

import { CreateOrderItemDto } from './dto/create-order-item.dto';

import { UpdateOrderItemDto } from './dto/update-order-item.dto';

import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';

@Controller('order_items')
@UseGuards(JwtAuthGuard)
export class OrderItemsController {
  constructor(
    private readonly orderItemsService: OrderItemsService,
  ) {}

  @Get()
  findAll() {
    return this.orderItemsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderItemsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateOrderItemDto,
    @Req() request: any,
  ) {
    return this.orderItemsService.create(
      dto,
      request.accessToken,
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderItemDto,
    @Req() request: any,
  ) {
    return this.orderItemsService.update(
      id,
      dto,
      request.accessToken,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orderItemsService.remove(id);
  }
}