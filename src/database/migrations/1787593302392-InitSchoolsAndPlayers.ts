import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm'

export class InitSchoolsAndPlayers1787593302392 implements MigrationInterface {
  name = 'InitSchoolsAndPlayers1787593302392'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'schools',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'publicId', type: 'varchar', length: '20', isNullable: true, isUnique: true },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'principalName', type: 'varchar', length: '255', isNullable: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: true, isUnique: true },
          { name: 'mobile', type: 'varchar', length: '20', isNullable: true },
          { name: 'hodName', type: 'varchar', length: '255', isNullable: true },
          { name: 'hodMobile', type: 'varchar', length: '20', isNullable: true },
          { name: 'hodEmail', type: 'varchar', length: '255', isNullable: true },
          { name: 'latitude', type: 'decimal', precision: 10, scale: 6, isNullable: true },
          { name: 'longitude', type: 'decimal', precision: 10, scale: 6, isNullable: true },
          { name: 'address', type: 'varchar', length: '500', isNullable: true },
          { name: 'city', type: 'varchar', length: '120', isNullable: true },
          { name: 'source', type: 'enum', enum: ['form_submission', 'seed'], default: "'form_submission'" },
          { name: 'isVerified', type: 'boolean', default: false },
          { name: 'verifiedAt', type: 'datetime', isNullable: true },
          { name: 'verificationToken', type: 'varchar', length: '64', isNullable: true },
          { name: 'verificationTokenExpiresAt', type: 'datetime', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
    )

    await queryRunner.createTable(
      new Table({
        name: 'players',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'publicId', type: 'varchar', length: '20', isNullable: true, isUnique: true },
          { name: 'schoolId', type: 'int' },
          { name: 'playerName', type: 'varchar', length: '255' },
          { name: 'dob', type: 'date' },
          { name: 'mobile', type: 'varchar', length: '20' },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'isVerified', type: 'boolean', default: false },
          { name: 'verifiedAt', type: 'datetime', isNullable: true },
          { name: 'verificationToken', type: 'varchar', length: '64', isNullable: true },
          { name: 'verificationTokenExpiresAt', type: 'datetime', isNullable: true },
          { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
    )

    await queryRunner.createForeignKey(
      'players',
      new TableForeignKey({
        columnNames: ['schoolId'],
        referencedTableName: 'schools',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const playersTable = await queryRunner.getTable('players')
    const fk = playersTable?.foreignKeys.find((f) => f.columnNames.includes('schoolId'))
    if (fk) await queryRunner.dropForeignKey('players', fk)
    await queryRunner.dropTable('players')
    await queryRunner.dropTable('schools')
  }
}
