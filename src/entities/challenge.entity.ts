import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('challenges')
@Index(['createdAt'])
export class ChallengeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column()
  question: string;

  @Column()
  answer: string;

  @Column()
  difficulty: string;

  @Column({ type: 'simple-json', nullable: true })
  options: string[];

  @Column()
  timeLimit: number;

  @Column()
  points: number;

  @Column({ nullable: true })
  riskScore: number;

  @Column({ nullable: true })
  ip: string;

  @CreateDateColumn()
  createdAt: Date;
}
