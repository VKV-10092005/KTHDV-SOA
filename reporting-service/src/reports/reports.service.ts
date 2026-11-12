import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderReport } from './entities/order-report.entity';
import { ProductReport } from './entities/product-report.entity';
import { CreateOrderReportDto } from './dto/create-order-report.dto';
import { CreateProductReportDto } from './dto/create-product-report.dto';
import { ExternalService } from '../external/external.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(OrderReport)
    private readonly orderReportRepo: Repository<OrderReport>,

    @InjectRepository(ProductReport)
    private readonly productReportRepo: Repository<ProductReport>,

    private readonly externalService: ExternalService,
    private readonly dataSource: DataSource,
  ) {}

  // 1. GET /reports/products
  async findAllProductReports(token?: string) {
    const reports = await this.productReportRepo.find({
      relations: { orderReport: true },
      order: { id: 'DESC' },
    });

    // Bổ sung số lượng hàng tồn hiện tại từ Product Service (3002)
    return Promise.all(
      reports.map(async (r) => {
        try {
          const product = await this.externalService.getProductById(r.product_id, token);
          return {
            ...r,
            product_name: product.name,
            current_stock: product.stock,
          };
        } catch {
          return { ...r, current_stock: null };
        }
      }),
    );
  }

  // 2. GET /reports/products/:id
  async findOneProductReport(id: number, token?: string) {
    const report = await this.productReportRepo.findOne({
      where: { id },
      relations: { orderReport: true },
    });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo sản phẩm ID ${id}`);
    }

    try {
      const product = await this.externalService.getProductById(report.product_id, token);
      return {
        ...report,
        product_name: product.name,
        current_stock: product.stock,
      };
    } catch {
      return report;
    }
  }

  // 3. GET /reports/orders
  async findAllOrderReports() {
    return this.orderReportRepo.find({
      relations: { productReports: true },
      order: { id: 'DESC' },
    });
  }

  // 4. GET /reports/orders/:id
  async findOneOrderReport(id: number) {
    const report = await this.orderReportRepo.findOne({
      where: { id },
      relations: { productReports: true },
    });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo đơn hàng ID ${id}`);
    }
    return report;
  }

  // 5. POST /reports/products
  async createProductReport(dto: CreateProductReportDto, token?: string) {
    const product = await this.externalService.getProductById(dto.product_id, token);
    const orders = await this.externalService.getAllOrders(token);

    let totalSold = 0;
    let totalRevenue = 0;

    // Duyệt tất cả đơn hàng (trừ đơn bị hủy) để tính số lượng đã bán & doanh thu
    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        if (Number(item.product_id) === dto.product_id) {
          totalSold += Number(item.quantity);
          totalRevenue += Number(item.total_price);
        }
      }
    }

    const unitCost =
      dto.unit_cost ??
      product.cost_price ??
      this.roundMoney(product.price * 0.7);

    const totalCost = this.roundMoney(totalSold * unitCost);
    const profit = this.roundMoney(totalRevenue - totalCost);

    const report = this.productReportRepo.create({
      order_report_id: dto.order_report_id ?? null,
      product_id: dto.product_id,
      total_sold: totalSold,
      revenue: this.roundMoney(totalRevenue),
      cost: totalCost,
      profit,
    });

    const saved = await this.productReportRepo.save(report);
    return {
      ...saved,
      product_name: product.name,
      current_stock: product.stock,
    };
  }

  // 6. POST /reports/orders
  async createOrderReport(dto: CreateOrderReportDto, token?: string) {
    const order = await this.externalService.getOrderById(dto.order_id, token);
    const items = Array.isArray(order.items) ? order.items : [];
    const ratio = dto.cost_ratio ?? 0.7;

    return this.dataSource.transaction(async (manager) => {
      let totalRevenue = 0;
      let totalCost = 0;

      const itemBreakdowns: Array<{
        product_id: number;
        total_sold: number;
        revenue: number;
        cost: number;
        profit: number;
      }> = [];

      for (const item of items) {
        const productId = Number(item.product_id);
        const qty = Number(item.quantity);
        const itemRevenue = Number(item.total_price);

        let unitCost = Number(item.unit_price) * ratio;
        try {
          const product = await this.externalService.getProductById(productId, token);
          if (product.cost_price != null) {
            unitCost = product.cost_price;
          }
        } catch {
          // Giữ tỷ lệ mặc định nếu không lấy được giá nhập
        }

        const itemCost = this.roundMoney(qty * unitCost);
        const itemProfit = this.roundMoney(itemRevenue - itemCost);

        totalRevenue += itemRevenue;
        totalCost += itemCost;

        itemBreakdowns.push({
          product_id: productId,
          total_sold: qty,
          revenue: this.roundMoney(itemRevenue),
          cost: itemCost,
          profit: itemProfit,
        });
      }

      const orderReport = manager.create(OrderReport, {
        order_id: dto.order_id,
        total_revenue: this.roundMoney(totalRevenue),
        total_cost: this.roundMoney(totalCost),
        total_profit: this.roundMoney(totalRevenue - totalCost),
      });

      const savedOrderReport = await manager.save(OrderReport, orderReport);

      // Tự động tạo các bản ghi product_reports liên kết với order_report_id
      const productReports = itemBreakdowns.map((b) =>
        manager.create(ProductReport, {
          ...b,
          order_report_id: savedOrderReport.id,
        }),
      );
      await manager.save(ProductReport, productReports);

      return manager.findOne(OrderReport, {
        where: { id: savedOrderReport.id },
        relations: { productReports: true },
      });
    });
  }

  // 7. DELETE /reports/products/:id
  async removeProductReport(id: number) {
    const report = await this.productReportRepo.findOneBy({ id });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo sản phẩm ID ${id}`);
    }
    await this.productReportRepo.remove(report);
    return { message: 'Xóa báo cáo sản phẩm thành công', id };
  }

  // 8. DELETE /reports/orders/:id
  async removeOrderReport(id: number) {
    const report = await this.orderReportRepo.findOneBy({ id });
    if (!report) {
      throw new NotFoundException(`Không tìm thấy báo cáo đơn hàng ID ${id}`);
    }
    await this.orderReportRepo.remove(report);
    return { message: 'Xóa báo cáo đơn hàng thành công', id };
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
