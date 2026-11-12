import {
  Injectable,
  BadGatewayException,
  NotFoundException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

import { ConfigService } from '@nestjs/config';

import { firstValueFrom } from 'rxjs';

import axios from 'axios';

export interface ProductInfo {
  id: number;
  name: string;
  price: number;
  stock: number;
}

@Injectable()
export class ProductsService {
  private readonly productUrl: string;

  constructor(
    private readonly httpService: HttpService,

    private readonly configService: ConfigService,
  ) {
    this.productUrl =
      this.configService.getOrThrow<string>(
        'PRODUCT_SERVICE_URL',
      );
  }

  async getProduct(
    productId: number,
    token?: string,
  ): Promise<ProductInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.productUrl}/products/${productId}`,
          {
            headers: token
              ? {
                  Authorization: token,
                }
              : {},
          },
        ),
      );

      const raw =
        response.data?.data ?? response.data;

      const product =
        raw?.product ?? raw;

      if (!product || product.id == null) {
        throw new NotFoundException(
          `Không tìm thấy sản phẩm ${productId}`,
        );
      }

      const name =
        product.name ??
        product.product_name ??
        product.title;

      const price = Number(
        product.price ??
        product.sale_price ??
        product.unit_price,
      );

      const stock = Number(
        product.stock ??
        product.stock_quantity ??
        product.quantity,
      );

      if (
        !name ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        throw new BadGatewayException(
          'Dữ liệu sản phẩm không hợp lệ',
        );
      }

      return {
        id: Number(product.id),
        name,
        price,
        stock,
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        throw new NotFoundException(
          `Không tìm thấy sản phẩm ${productId}`,
        );
      }

      throw new BadGatewayException(
        'Không thể kết nối Product Service',
      );
    }
  }
}