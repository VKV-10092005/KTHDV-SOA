import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { ProductReport } from './product-report.entity';

@Entity('orders_reports')
export class OrderReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  order_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_cost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_profit: number;

  @OneToMany(() => ProductReport, (pr) => pr.orderReport, {
    cascade: true,
  })
  productReports: ProductReport[];
}
