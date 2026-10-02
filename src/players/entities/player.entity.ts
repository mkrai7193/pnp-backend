import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { School } from '../../institutions/entities/school.entity'

@Entity({ name: 'players' })
export class Player {
  @PrimaryGeneratedColumn()
  id: number

  /** Pattern-based public ID, e.g. `PLY-26-000001` — see common/public-id.util.ts. Assigned after insert. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  publicId: string | null

  @ManyToOne(() => School, (school) => school.players, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'schoolId' })
  school: School

  @Column()
  schoolId: number

  @Column({ type: 'varchar', length: 255 })
  playerName: string

  @Column({ type: 'date' })
  dob: string

  @Column({ type: 'varchar', length: 20 })
  mobile: string

  /** Doubles as the future player-portal login (email = username, per the frontend's footer note). */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string

  @Column({ type: 'boolean', default: false })
  isVerified: boolean

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date | null

  @Column({ type: 'varchar', length: 64, nullable: true })
  verificationToken: string | null

  @Column({ type: 'datetime', nullable: true })
  verificationTokenExpiresAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
