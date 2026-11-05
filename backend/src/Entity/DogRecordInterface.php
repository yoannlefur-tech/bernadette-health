<?php

declare(strict_types=1);

namespace App\Entity;

/**
 * A resource belonging to a dog: only the owners of that dog can access it.
 *
 * @see \App\Doctrine\OwnerAccessExtension
 */
interface DogRecordInterface
{
    public function getDog(): ?Dog;
}
