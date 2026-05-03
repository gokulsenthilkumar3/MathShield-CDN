import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('verifications')
@Index(['createdAt'])
export class VerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  challengeId: string;

  @Column()
  challengeType: string;

  @Column()
  difficulty: string;

  @Column()
  success: boolean;

  @Column()
  confidence: number;

  @Column()
  intelligenceScore: number;

  @Column()
  riskLevel: string;

  @Column()
  timeTaken: number;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  behaviorData: any;

  @Column()
  riskScore: number;

  @CreateDateColumn()
  createdAt: Date;
}
