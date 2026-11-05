<?php

declare(strict_types=1);

namespace App\Tests\Api;

use App\Entity\Dog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;

final class OwnershipTest extends ApiResourceTestCase
{
    private User $other;

    protected function setUp(): void
    {
        parent::setUp();
        $this->other = $this->createUser('other@example.com');
    }

    /** @return iterable<string, array{string, array<string, mixed>, array<string, mixed>}> */
    public static function records(): iterable
    {
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

    /** @param array<string, mixed> $body */
    private function createRecord(string $collection, string $dog, array $body): string
    {
        $response = $this->post($collection, $body + ['dog' => $dog]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['@id'];
    }

    private function dogOwnerRows(string $dog_iri): int
    {
        return (int) static::getContainer()->get(EntityManagerInterface::class)->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM dog_owner WHERE dog_id = ?',
            [basename($dog_iri)],
        );
    }

    public function testCreatorBecomesTheOnlyOwner(): void
    {
        $dog = $this->createDog();

        self::assertSame(1, $this->dogOwnerRows($dog));
        self::assertContains($dog, $this->collectionValues('/api/dogs', '@id'));
    }

    public function testDogCollectionOnlyListsOwnDogs(): void
    {
        $mine = $this->createDog(['name' => 'Bernadette']);
        $this->actingAs($this->other);
        $theirs = $this->createDog(['name' => 'Marcel']);

        self::assertSame([$theirs], $this->collectionValues('/api/dogs', '@id'));

        $this->actingAs($this->user);
        self::assertSame([$mine], $this->collectionValues('/api/dogs', '@id'));
    }

    public function testDogOfAnotherUserDoesNotExist(): void
    {
        $dog = $this->createDog();
        $this->actingAs($this->other);

        $this->get($dog);
        self::assertResponseStatusCodeSame(404);
        $this->patch($dog, ['coat' => 'Changed']);
        self::assertResponseStatusCodeSame(404);
        $this->delete($dog);
        self::assertResponseStatusCodeSame(404);

        $this->actingAs($this->user);
        self::assertSame('Poil ras, fauve', $this->get($dog)->toArray()['coat']);
    }

    public function testDogWithoutOwnerIsVisibleToNobody(): void
    {
        $entity_manager = static::getContainer()->get(EntityManagerInterface::class);
        $dog = (new Dog())
            ->setName('Orphan')
            ->setBirthDate(new \DateTimeImmutable('2022-03-14'))
            ->setBreed('Teckel')
            ->setCoat('Poil ras');
        $entity_manager->persist($dog);
        $entity_manager->flush();

        self::assertSame([], $this->collectionValues('/api/dogs', '@id'));
        $this->get('/api/dogs/'.$dog->getId()->toRfc4122());
        self::assertResponseStatusCodeSame(404);
    }

    public function testASecondOwnerSeesTheDogAndItsRecords(): void
    {
        $dog = $this->createDog();
        $entry = $this->createRecord('/api/weight_entries', $dog, ['measured_at' => '2024-01-15', 'weight_grams' => 4200]);
        $this->addOwnerInDatabase($dog, $this->other);

        $this->actingAs($this->other);

        self::assertSame([$dog], $this->collectionValues('/api/dogs', '@id'));
        self::assertSame([$entry], $this->collectionValues('/api/weight_entries', '@id'));
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $patch
     */
    #[DataProvider('records')]
    public function testRecordOfAnotherUserDoesNotExist(string $collection, array $body, array $patch): void
    {
        $dog = $this->createDog();
        $record = $this->createRecord($collection, $dog, $body);
        $this->actingAs($this->other);

        self::assertSame([], $this->collectionValues($collection, '@id'));
        self::assertSame([], $this->collectionValues($collection.'?dog='.$dog, '@id'));
        $this->get($record);
        self::assertResponseStatusCodeSame(404);
        $this->patch($record, $patch);
        self::assertResponseStatusCodeSame(404);
        $this->delete($record);
        self::assertResponseStatusCodeSame(404);

        $this->actingAs($this->user);
        $this->get($record);
        self::assertResponseIsSuccessful();
        foreach ($patch as $field => $value) {
            self::assertNotSame($value, $this->get($record)->toArray()[$field]);
        }
    }

    /**
     * @param array<string, mixed> $body
     * @param array<string, mixed> $patch
     */
    #[DataProvider('records')]
    public function testRecordCannotBeAttachedToTheDogOfAnotherUser(string $collection, array $body, array $patch): void
    {
        $dog = $this->createDog();
        $this->actingAs($this->other);

        $response = $this->post($collection, $body + ['dog' => $dog]);

        self::assertResponseStatusCodeSame(400);
        self::assertStringNotContainsString('Bernadette', $response->getContent(false));

        $this->actingAs($this->user);
        self::assertSame([], $this->collectionValues($collection, '@id'));
    }

    public function testOwnersAreNeitherReadableNorWritable(): void
    {
        $other_iri = '/api/users/'.$this->other->getId()->toRfc4122();

        $response = $this->post('/api/dogs', [
            'name' => 'Bernadette',
            'birth_date' => '2022-03-14',
            'breed' => 'Teckel nain',
            'coat' => 'Poil ras, fauve',
            'owners' => [$other_iri],
        ]);
        self::assertResponseStatusCodeSame(201);
        $dog = $response->toArray();
        self::assertArrayNotHasKey('owners', $dog);
        self::assertSame(1, $this->dogOwnerRows($dog['@id']));

        $patched = $this->patch($dog['@id'], ['owners' => [$other_iri]]);
        self::assertResponseIsSuccessful();
        self::assertArrayNotHasKey('owners', $patched->toArray());

        $this->actingAs($this->other);
        $this->get($dog['@id']);
        self::assertResponseStatusCodeSame(404);
    }

    public function testDogWithOwnersButNoRecordCanBeDeleted(): void
    {
        $dog = $this->createDog();
        $this->addOwnerInDatabase($dog, $this->other);
        self::assertSame(2, $this->dogOwnerRows($dog));

        $this->delete($dog);

        self::assertResponseStatusCodeSame(204);
        self::assertSame(0, $this->dogOwnerRows($dog));
    }

    public function testDogWithRecordsCannotBeDeletedAndKeepsItsOwners(): void
    {
        $dog = $this->createDog();
        $this->createRecord('/api/weight_entries', $dog, ['measured_at' => '2024-01-15', 'weight_grams' => 4200]);

        $this->delete($dog);

        self::assertResponseStatusCodeSame(409);
        self::assertSame(1, $this->dogOwnerRows($dog));
        $this->get($dog);
        self::assertResponseIsSuccessful();
    }
}
