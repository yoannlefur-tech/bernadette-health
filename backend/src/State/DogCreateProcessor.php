<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Dog;
use App\Entity\User;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * Makes the current user the owner of the dog they create. A dog without owner
 * would be visible to nobody.
 *
 * @implements ProcessorInterface<Dog, Dog>
 */
final readonly class DogCreateProcessor implements ProcessorInterface
{
    /** @param ProcessorInterface<Dog, Dog> $persist_processor */
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persist_processor,
        private TokenStorageInterface $token_storage,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Dog
    {
        $user = $this->token_storage->getToken()?->getUser();
        if (!$user instanceof User) {
            throw new AccessDeniedException();
        }

        return $this->persist_processor->process($data->addOwner($user), $operation, $uriVariables, $context);
    }
}
