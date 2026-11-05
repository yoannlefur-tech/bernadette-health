<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261105142746 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE vaccination (
              id UUID NOT NULL,
              name VARCHAR(150) NOT NULL,
              administered_at DATE NOT NULL,
              next_due_at DATE DEFAULT NULL,
              veterinarian VARCHAR(150) DEFAULT NULL,
              notes TEXT DEFAULT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              dog_id UUID NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_1B099999634DFEB ON vaccination (dog_id)');
        $this->addSql(<<<'SQL'
            ALTER TABLE
              vaccination
            ADD
              CONSTRAINT FK_1B099999634DFEB FOREIGN KEY (dog_id) REFERENCES dog (id) ON DELETE RESTRICT NOT DEFERRABLE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE vaccination DROP CONSTRAINT FK_1B099999634DFEB');
        $this->addSql('DROP TABLE vaccination');
    }
}
