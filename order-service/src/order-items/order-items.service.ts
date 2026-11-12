import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository, DataSource, EntityManager } from 'typeorm';

import { OrderItem } from './entities/order-item.entity';

import { Order } from '../orders/entities/order.entity';

import { CreateOrderItemDto } from './dto/create-order-item.dto';

import { UpdateOrderItemDto } from './dto/update-order-item.dto';

import { ProductsService } from '../products/products.service';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly itemRepository: Repository<OrderItem>,

    private readonly dataSource: DataSource,

    private readonly productsService: ProductsService,
  ) {}

  // GET /order_items
  async findAll() {
    return this.itemRepository.find({
      relations: {
          order: true,
     },
      order: {
        id: 'DESC',
      },
    });
  }

  // GET /order_items/:id
  async findOne(id: number) {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: {
          order: true,
     },
    });

    if (!item) {
      throw new NotFoundException(
        `Không tìm thấy chi tiết đơn hàng ID ${id}`,
      );
    }

    return item;
  }

  // POST /order_items
  async create(
    dto: CreateOrderItemDto,
    token: string,
  ) {
    const order = await this.dataSource
      .getRepository(Order)
      .findOneBy({
        id: dto.order_id,
      });

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng',
      );
    }

    const product =
      await this.productsService.getProduct(
        dto.product_id,
        token,
      );

    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        'Số lượng sản phẩm trong kho không đủ',
      );
    }

    return this.dataSource.transaction(
      async (manager) => {
        const item = manager.create(OrderItem, {
          order_id: dto.order_id,
          product_id: product.id,
          product_name: product.name,
          quantity: dto.quantity,
          unit_price: product.price,
          total_price: this.roundMoney(
            product.price * dto.quantity,
          ),
        });

        const savedItem = await manager.save(
          OrderItem,
          item,
        );

        await this.updateOrderTotal(
          manager,
          dto.order_id,
        );

        return savedItem;
      },
    );
  }

  // PUT /order_items/:id
  async update(
    id: number,
    dto: UpdateOrderItemDto,
    token: string,
  ) {
    const item = await this.findOne(id);

    const productId =
      dto.product_id ?? item.product_id;

    const quantity =
      dto.quantity ?? item.quantity;

    const product =
      await this.productsService.getProduct(
        productId,
        token,
      );

    if (product.stock < quantity) {
      throw new BadRequestException(
        'Số lượng sản phẩm trong kho không đủ',
      );
    }

    return this.dataSource.transaction(
      async (manager) => {
        item.product_id = product.id;
        item.product_name = product.name;
        item.quantity = quantity;
        item.unit_price = product.price;

        item.total_price = this.roundMoney(
          product.price * quantity,
        );

        const savedItem = await manager.save(
          OrderItem,
          item,
        );

        await this.updateOrderTotal(
          manager,
          item.order_id,
        );

        return savedItem;
      },
    );
  }

  // DELETE /order_items/:id
  async remove(id: number) {
    const item = await this.findOne(id);

    return this.dataSource.transaction(
      async (manager) => {
        await manager.remove(
          OrderItem,
          item,
        );

        await this.updateOrderTotal(
          manager,
          item.order_id,
        );

        return {
          message: 'Xóa chi tiết đơn hàng thành công',
          id,
        };
      },
    );
  }

  // Tính lại tổng tiền đơn hàng
  private async updateOrderTotal(
    manager: EntityManager,
    orderId: number,
  ) {
    const result = await manager
      .getRepository(OrderItem)
      .createQueryBuilder('item')
      .select('SUM(item.total_price)', 'total')
      .where('item.order_id = :orderId', {
        orderId,
      })
      .getRawOne();

    const total = Number(result?.total ?? 0);

    await manager.update(
      Order,
      { id: orderId },
      {
        total_amount: this.roundMoney(total),
      },
    );
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}