import {
  Injectable,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';

@Injectable()
export class ExternalService {
  private readonly productUrl: string;
  private readonly orderUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.productUrl = this.configService.getOrThrow<string>('PRODUCT_SERVICE_URL');
    this.orderUrl = this.configService.getOrThrow<string>('ORDER_SERVICE_URL');
  }

  async getProductById(productId: number, token?: string) {
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${this.productUrl}/products/${productId}`, {
          headers: token ? { Authorization: token } : {},
        }),
      );
      const data = res.data?.data ?? res.data;
      if (!data || data.id == null) {
        throw new NotFoundException(`Không tìm thấy sản phẩm ID ${productId}`);
      }
      return {
        id: Number(data.id),
        name: data.name ?? data.product_name,
        price: Number(data.price ?? 0),
        cost_price: data.cost_price != null ? Number(data.cost_price) : null,
        stock: Number(data.quantity ?? data.stock ?? 0),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundException(`Không tìm thấy sản phẩm ID ${productId}`);
      }
      throw new BadGatewayException('Không thể kết nối Product Service (3002)');
    }
  }

  async getOrderById(orderId: number, token?: string) {
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${this.orderUrl}/orders/${orderId}`, {
          headers: token ? { Authorization: token } : {},
        }),
      );
      return res.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundException(`Không tìm thấy đơn hàng ID ${orderId}`);
      }
      throw new BadGatewayException('Không thể kết nối Order Service (3003)');
    }
  }

  async getAllOrders(token?: string) {
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${this.orderUrl}/orders`, {
          headers: token ? { Authorization: token } : {},
        }),
      );
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      throw new BadGatewayException('Không thể lấy danh sách đơn hàng từ Order Service (3003)');
    }
  }
}
