import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository, DataSource } from 'typeorm';

import { Order, OrderStatus } from './entities/order.entity';

import { OrderItem } from '../order-items/entities/order-item.entity';

import { CreateOrderDto } from './dto/create-order.dto';

import { UpdateOrderDto } from './dto/update-order.dto';

import { ProductsService } from '../products/products.service';

interface CheckedOrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly dataSource: DataSource,

    private readonly productsService: ProductsService,
    
  ) {}

  // GET /orders
  async findAll() {
    return this.orderRepository.find({
      relations: {
          items: true,
     },
      order: {
        created_at: 'DESC',
      },
    });
  }

  // GET /orders/:id
  async findOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
          items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng ID ${id}`,
      );
    }

    return order;
  }

  // POST /orders
  async create(
    dto: CreateOrderDto,
    token: string,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'Đơn hàng phải có ít nhất một sản phẩm',
      );
    }

    // Kiểm tra sản phẩm từ Product Service
    const checkedItems: CheckedOrderItem[] = [];

    for (const item of dto.items) {
      const product =
        await this.productsService.getProduct(
          item.product_id,
          token,
        );

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm`,
        );
      }

      checkedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: this.roundMoney(
          product.price * item.quantity,
        ),
      });
    }

    // Tính tổng tiền
    const totalAmount = this.roundMoney(
      checkedItems.reduce(
        (sum, item) => sum + item.total_price,
        0,
      ),
    );

    // Lưu đơn hàng và chi tiết trong transaction
    return this.dataSource.transaction(
      async (manager) => {
        const order = manager.create(Order, {
          customer_name: dto.customer_name,
          customer_email: dto.customer_email,
          total_amount: totalAmount,
          status: OrderStatus.PENDING,
        });

        const savedOrder = await manager.save(
          Order,
          order,
        );

        const orderItems = checkedItems.map((item) =>
          manager.create(OrderItem, {
            ...item,
            order_id: savedOrder.id,
          }),
        );

        await manager.save(OrderItem, orderItems);

        return manager.findOne(Order, {
          where: { id: savedOrder.id },
          relations: {
               items: true,
          },
        });
      },
    );
  }

  // PUT /orders/:id
  async update(
    id: number,
    dto: UpdateOrderDto,
  ) {
    const order = await this.findOne(id);

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Không thể cập nhật trạng thái đơn hàng đã kết thúc',
      );
    }

    order.status = dto.status;

    await this.orderRepository.save(order);

    return this.findOne(id);
  }

  // DELETE /orders/:id
  async remove(id: number) {
    const order = await this.findOne(id);

    await this.orderRepository.remove(order);

    return {
      message: 'Xóa đơn hàng thành công',
      id,
    };
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}