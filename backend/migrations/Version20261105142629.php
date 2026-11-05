<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261105142629 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE weight_entry (
              id UUID NOT NULL,
              measured_at DATE NOT NULL,
              weight_grams INT NOT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              dog_id UUID NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_1486C8C0634DFEB ON weight_entry (dog_id)');
        $this->addSql(<<<'SQL'
            ALTER TABLE
              weight_entry
            ADD
              CONSTRAINT FK_1486C8C0634DFEB FOREIGN KEY (dog_id) REFERENCES dog (id) ON DELETE RESTRICT NOT DEFERRABLE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE weight_entry DROP CONSTRAINT FK_1486C8C0634DFEB');
        $this->addSql('DROP TABLE weight_entry');
    }
}
