import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddStateZipToSchools1787600404932 implements MigrationInterface {
  name = 'AddStateZipToSchools1787600404932'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('schools', [
      new TableColumn({ name: 'state', type: 'varchar', length: '120', isNullable: true }),
      new TableColumn({ name: 'zipCode', type: 'varchar', length: '20', isNullable: true }),
    ])
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('schools', ['state', 'zipCode'])
  }
}
