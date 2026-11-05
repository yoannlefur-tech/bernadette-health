<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261105161339 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE dog ADD created_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE dog ADD updated_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE dog ADD CONSTRAINT FK_812C397DB03A8386 FOREIGN KEY (created_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE dog ADD CONSTRAINT FK_812C397D896DBBDE FOREIGN KEY (updated_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_812C397DB03A8386 ON dog (created_by_id)');
        $this->addSql('CREATE INDEX IDX_812C397D896DBBDE ON dog (updated_by_id)');
        $this->addSql('ALTER TABLE vaccination ADD created_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE vaccination ADD updated_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE vaccination ADD CONSTRAINT FK_1B099999B03A8386 FOREIGN KEY (created_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE vaccination ADD CONSTRAINT FK_1B099999896DBBDE FOREIGN KEY (updated_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_1B099999B03A8386 ON vaccination (created_by_id)');
        $this->addSql('CREATE INDEX IDX_1B099999896DBBDE ON vaccination (updated_by_id)');
        $this->addSql('ALTER TABLE vet_visit ADD created_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE vet_visit ADD updated_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE vet_visit ADD CONSTRAINT FK_9D185010B03A8386 FOREIGN KEY (created_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE vet_visit ADD CONSTRAINT FK_9D185010896DBBDE FOREIGN KEY (updated_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_9D185010B03A8386 ON vet_visit (created_by_id)');
        $this->addSql('CREATE INDEX IDX_9D185010896DBBDE ON vet_visit (updated_by_id)');
        $this->addSql('ALTER TABLE weight_entry ADD created_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE weight_entry ADD updated_by_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE weight_entry ADD CONSTRAINT FK_1486C8C0B03A8386 FOREIGN KEY (created_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE weight_entry ADD CONSTRAINT FK_1486C8C0896DBBDE FOREIGN KEY (updated_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE INDEX IDX_1486C8C0B03A8386 ON weight_entry (created_by_id)');
        $this->addSql('CREATE INDEX IDX_1486C8C0896DBBDE ON weight_entry (updated_by_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE dog DROP CONSTRAINT FK_812C397DB03A8386');
        $this->addSql('ALTER TABLE dog DROP CONSTRAINT FK_812C397D896DBBDE');
        $this->addSql('DROP INDEX IDX_812C397DB03A8386');
        $this->addSql('DROP INDEX IDX_812C397D896DBBDE');
        $this->addSql('ALTER TABLE dog DROP created_by_id');
        $this->addSql('ALTER TABLE dog DROP updated_by_id');
        $this->addSql('ALTER TABLE vaccination DROP CONSTRAINT FK_1B099999B03A8386');
        $this->addSql('ALTER TABLE vaccination DROP CONSTRAINT FK_1B099999896DBBDE');
        $this->addSql('DROP INDEX IDX_1B099999B03A8386');
        $this->addSql('DROP INDEX IDX_1B099999896DBBDE');
        $this->addSql('ALTER TABLE vaccination DROP created_by_id');
        $this->addSql('ALTER TABLE vaccination DROP updated_by_id');
        $this->addSql('ALTER TABLE vet_visit DROP CONSTRAINT FK_9D185010B03A8386');
        $this->addSql('ALTER TABLE vet_visit DROP CONSTRAINT FK_9D185010896DBBDE');
        $this->addSql('DROP INDEX IDX_9D185010B03A8386');
        $this->addSql('DROP INDEX IDX_9D185010896DBBDE');
        $this->addSql('ALTER TABLE vet_visit DROP created_by_id');
        $this->addSql('ALTER TABLE vet_visit DROP updated_by_id');
        $this->addSql('ALTER TABLE weight_entry DROP CONSTRAINT FK_1486C8C0B03A8386');
        $this->addSql('ALTER TABLE weight_entry DROP CONSTRAINT FK_1486C8C0896DBBDE');
        $this->addSql('DROP INDEX IDX_1486C8C0B03A8386');
        $this->addSql('DROP INDEX IDX_1486C8C0896DBBDE');
        $this->addSql('ALTER TABLE weight_entry DROP created_by_id');
        $this->addSql('ALTER TABLE weight_entry DROP updated_by_id');
    }
}
