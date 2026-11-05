<?php

declare(strict_types=1);

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Dog;
use App\Entity\DogRecordInterface;
use App\Entity\User;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Restricts dogs and their records to the owners of the dog. Item operations
 * and IRI resolution go through it too, so the resource of another user does
 * not exist: 404 on an item, 400 on a relation.
 */
final readonly class OwnerAccessExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function __construct(private TokenStorageInterface $token_storage)
    {
    }

    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        $this->restrictToOwner($queryBuilder, $queryNameGenerator, $resourceClass);
    }

    public function applyToItem(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        array $identifiers,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        $this->restrictToOwner($queryBuilder, $queryNameGenerator, $resourceClass);
    }

    private function restrictToOwner(
        QueryBuilder $query_builder,
        QueryNameGeneratorInterface $query_name_generator,
        string $resource_class,
    ): void {
        $is_record = is_a($resource_class, DogRecordInterface::class, true);
        if (Dog::class !== $resource_class && !$is_record) {
            return;
        }

        $user = $this->token_storage->getToken()?->getUser();
        if (!$user instanceof User) {
            $query_builder->andWhere('1 = 0');

            return;
        }

        $dog_alias = $query_builder->getRootAliases()[0];
        if ($is_record) {
            $record_alias = $dog_alias;
            $dog_alias = $query_name_generator->generateJoinAlias('dog');
            $query_builder->innerJoin($record_alias.'.dog', $dog_alias);
        }

        // MEMBER OF rather than a join on owners: no duplicates, and the
        // paginator is left with a to-one join at most.
        $parameter = $query_name_generator->generateParameterName('current_user');
        $query_builder
            ->andWhere(\sprintf(':%s MEMBER OF %s.owners', $parameter, $dog_alias))
            ->setParameter($parameter, $user);
    }
}
