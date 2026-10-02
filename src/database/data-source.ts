import 'dotenv/config'
import { DataSource } from 'typeorm'
import { School } from '../institutions/entities/school.entity'
import { Player } from '../players/entities/player.entity'

/**
 * Used two ways: (1) imported by AppModule via TypeOrmModule.forRootAsync for the running app,
 * and (2) as the CLI data source for `npm run migration:*` (see package.json's `typeorm` script).
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'pnp',
  password: process.env.DB_PASSWORD || 'pnp',
  database: process.env.DB_DATABASE || 'pnp_sports',
  entities: [School, Player],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
})
