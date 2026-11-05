<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * @implements ProviderInterface<User>
 */
final readonly class CurrentUserProvider implements ProviderInterface
{
    public function __construct(private TokenStorageInterface $token_storage)
    {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?User
    {
        $user = $this->token_storage->getToken()?->getUser();

        return $user instanceof User ? $user : null;
    }
}
