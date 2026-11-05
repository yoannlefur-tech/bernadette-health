<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261105161103 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE dog_owner (dog_id UUID NOT NULL, user_id UUID NOT NULL, PRIMARY KEY (dog_id, user_id))');
        $this->addSql('CREATE INDEX IDX_54C6AF39634DFEB ON dog_owner (dog_id)');
        $this->addSql('CREATE INDEX IDX_54C6AF39A76ED395 ON dog_owner (user_id)');
        $this->addSql('ALTER TABLE dog_owner ADD CONSTRAINT FK_54C6AF39634DFEB FOREIGN KEY (dog_id) REFERENCES dog (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE dog_owner ADD CONSTRAINT FK_54C6AF39A76ED395 FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE dog_owner DROP CONSTRAINT FK_54C6AF39634DFEB');
        $this->addSql('ALTER TABLE dog_owner DROP CONSTRAINT FK_54C6AF39A76ED395');
        $this->addSql('DROP TABLE dog_owner');
    }
}
