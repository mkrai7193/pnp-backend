import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Player } from '../../players/entities/player.entity'

export enum SchoolSource {
  FORM_SUBMISSION = 'form_submission',
  SEED = 'seed',
}

@Entity({ name: 'schools' })
export class School {
  @PrimaryGeneratedColumn()
  id: number

  /** Pattern-based public ID, e.g. `SCH-26-000001` — see common/public-id.util.ts. Assigned after insert. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  publicId: string | null

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  principalName: string | null

  /** School's own contact email. Nullable because seeded legacy schools don't have one on file yet. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  hodName: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  hodMobile: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  hodEmail: string | null

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: string | null

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  state: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string | null

  @Column({ type: 'enum', enum: SchoolSource, default: SchoolSource.FORM_SUBMISSION })
  source: SchoolSource

  @Column({ type: 'boolean', default: false })
  isVerified: boolean

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date | null

  @Column({ type: 'varchar', length: 64, nullable: true })
  verificationToken: string | null

  @Column({ type: 'datetime', nullable: true })
  verificationTokenExpiresAt: Date | null

  @OneToMany(() => Player, (player) => player.school)
  players: Player[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
