import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderReport } from './order-report.entity';

@Entity('product_reports')
export class ProductReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  order_report_id: number | null;

  @Column({ type: 'int' })
  product_id: number;

  @Column({ type: 'int', default: 0 })
  total_sold: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  revenue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  profit: number;

  @ManyToOne(() => OrderReport, (or) => or.productReports, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'order_report_id' })
  orderReport: OrderReport;
}
