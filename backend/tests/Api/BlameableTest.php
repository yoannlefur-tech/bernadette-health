<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Dog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;

final class BlameableTest extends ApiResourceTestCase
{
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();
        $this->other = $this->createUser('other@example.com');
    }

    private static function iri(User $user): string
    {
        return '/api/users/'.$user->getId()->toRfc4122();
    }

    /** @return iterable<string, array{string, array<string, mixed>, array<string, mixed>}> */
    public static function resources(): iterable
    {
        yield 'dog' => [
            '/api/dogs',
            ['name' => 'Marcel', 'birth_date' => '2023-01-01', 'breed' => 'Teckel', 'coat' => 'Poil dur'],
            ['coat' => 'Poil long'],
        ];
        yield 'weight entry' => [
            '/api/weight_entries',
            ['measured_at' => '2024-01-15', 'weight_grams' => 4200],
            ['weight_grams' => 4350],
        ];
        yield 'vaccination' => [
            '/api/vaccinations',
            ['name' => 'CHPPiL', 'administered_at' => '2024-01-15'],
            ['name' => 'Rage'],
        ];
        yield 'vet visit' => [
            '/api/vet_visits',
            ['visited_at' => '2024-01-15', 'reason' => 'Contrôle annuel'],
            ['reason' => 'Boiterie'],
        ];
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array<string, mixed> the created resource
     */
    private function create(string $collection, array $body, string $dog): array
    {
        $response = $this->post($collection, '/api/dogs' === $collection ? $body : $body + ['dog' => $dog]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray();
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $patch
     */
    #[DataProvider('resources')]
    public function testCreationFillsBothWithTheCurrentUserIri(string $collection, array $body, array $patch): void
    {
        $resource = $this->create($collection, $body, $this->createDog());

        self::assertSame(self::iri($this->user), $resource['created_by']);
        self::assertSame(self::iri($this->user), $resource['updated_by']);
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $patch
     */
    #[DataProvider('resources')]
    public function testUpdateByAnotherOwnerOnlyChangesUpdatedBy(string $collection, array $body, array $patch): void
    {
        $dog = $this->createDog();
        $resource = $this->create($collection, $body, $dog);
        $this->addOwnerInDatabase('/api/dogs' === $collection ? $resource['@id'] : $dog, $this->other);
        $this->actingAs($this->other);

        $patched = $this->patch($resource['@id'], $patch);

        self::assertResponseIsSuccessful();
        self::assertSame(self::iri($this->user), $patched->toArray()['created_by']);
        self::assertSame(self::iri($this->other), $patched->toArray()['updated_by']);

        $read = $this->get($resource['@id'])->toArray();
        self::assertSame(self::iri($this->user), $read['created_by']);
        self::assertSame(self::iri($this->other), $read['updated_by']);
    }

    public function testCannotBeWrittenThroughTheApi(): void
    {
        $response = $this->post('/api/dogs', [
            'name' => 'Marcel',
            'birth_date' => '2023-01-01',
            'breed' => 'Teckel',
            'coat' => 'Poil dur',
            'created_by' => self::iri($this->other),
            'updated_by' => self::iri($this->other),
        ]);
        self::assertResponseStatusCodeSame(201);
        $dog = $response->toArray();
        self::assertSame(self::iri($this->user), $dog['created_by']);
        self::assertSame(self::iri($this->user), $dog['updated_by']);

        $patched = $this->patch($dog['@id'], [
            'coat' => 'Poil long',
            'created_by' => self::iri($this->other),
            'updated_by' => self::iri($this->other),
        ])->toArray();
        self::assertSame(self::iri($this->user), $patched['created_by']);
        self::assertSame(self::iri($this->user), $patched['updated_by']);
    }

    public function testStayNullWithoutToken(): void
    {
        $entity_manager = static::getContainer()->get(EntityManagerInterface::class);
        $dog = (new Dog())
            ->setName('Marcel')
            ->setBirthDate(new \DateTimeImmutable('2023-01-01'))
            ->setBreed('Teckel')
            ->setCoat('Poil dur');
        $entity_manager->persist($dog);
        $entity_manager->flush();

        self::assertNull($dog->getCreatedBy());
        self::assertNull($dog->getUpdatedBy());
    }

    public function testBecomeNullWhenTheUserIsDeleted(): void
    {
        $this->actingAs($this->other);
        $dog = $this->createDog();
        $this->addOwnerInDatabase($dog, $this->user);

        $entity_manager = static::getContainer()->get(EntityManagerInterface::class);
        $entity_manager->remove($entity_manager->find(User::class, $this->other->getId()));
        $entity_manager->flush();
        $entity_manager->clear();

        $this->actingAs($this->user);
        $read = $this->get($dog);

        self::assertResponseIsSuccessful();
        self::assertNull($read->toArray()['created_by'] ?? null);
        self::assertNull($read->toArray()['updated_by'] ?? null);
    }
}
