<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261105142832 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE vet_visit (
              id UUID NOT NULL,
              visited_at DATE NOT NULL,
              reason VARCHAR(255) NOT NULL,
              diagnosis TEXT DEFAULT NULL,
              cost_cents INT DEFAULT NULL,
              notes TEXT DEFAULT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              dog_id UUID NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_9D185010634DFEB ON vet_visit (dog_id)');
        $this->addSql(<<<'SQL'
            ALTER TABLE
              vet_visit
            ADD
              CONSTRAINT FK_9D185010634DFEB FOREIGN KEY (dog_id) REFERENCES dog (id) ON DELETE RESTRICT NOT DEFERRABLE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE vet_visit DROP CONSTRAINT FK_9D185010634DFEB');
        $this->addSql('DROP TABLE vet_visit');
    }
}
