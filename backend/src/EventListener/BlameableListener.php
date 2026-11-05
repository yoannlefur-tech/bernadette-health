<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\BlameableInterface;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PrePersistEventArgs;
use Doctrine\ORM\Event\PreUpdateEventArgs;
use Doctrine\ORM\Events;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Records who writes an entity, from the current token: nobody in console
 * commands and fixtures. The UnitOfWork recomputes the change set after
 * preUpdate, so changing the entity there is taken into account.
 */
#[AsDoctrineListener(event: Events::prePersist)]
#[AsDoctrineListener(event: Events::preUpdate)]
final readonly class BlameableListener
{
    public function __construct(private TokenStorageInterface $token_storage)
    {
    }

    public function prePersist(PrePersistEventArgs $args): void
    {
        $entity = $args->getObject();

        if ($entity instanceof BlameableInterface) {
            $user = $this->currentUser();
            $entity->setCreatedBy($user)->setUpdatedBy($user);
        }
    }

    public function preUpdate(PreUpdateEventArgs $args): void
    {
        $entity = $args->getObject();

        if ($entity instanceof BlameableInterface) {
            $entity->setUpdatedBy($this->currentUser());
        }
    }

    private function currentUser(): ?User
    {
        $user = $this->token_storage->getToken()?->getUser();

        return $user instanceof User ? $user : null;
    }
}
