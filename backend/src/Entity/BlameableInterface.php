<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * Filled by App\EventListener\BlameableListener.
 */
interface BlameableInterface
{
    public function setCreatedBy(?User $created_by): static;

    public function setUpdatedBy(?User $updated_by): static;
}
