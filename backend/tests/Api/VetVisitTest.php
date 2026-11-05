<?php

declare(strict_types=1);

namespace App\Tests\Api;

final class VetVisitTest extends ApiResourceTestCase
{
    /** @param array<string, mixed> $overrides */
    private function createVisit(string $dog, array $overrides = []): string
    {
        $response = $this->post('/api/vet_visits', $overrides + [
            'dog' => $dog,
            'visited_at' => '2024-01-15',
            'reason' => 'Contrôle annuel',
        ]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['@id'];
    }

    public function testCrud(): void
    {
        $dog = $this->createDog();

        $response = $this->post('/api/vet_visits', [
            'dog' => $dog,
            'visited_at' => '2024-01-15',
            'reason' => 'Boiterie',
            'diagnosis' => 'Entorse légère',
            'cost_cents' => 4500,
            'notes' => 'Repos 10 jours',
        ]);
        self::assertResponseStatusCodeSame(201);
        $visit = $response->toArray();
        self::assertSame($dog, $visit['dog']);
        self::assertSame(4500, $visit['cost_cents']);
        self::assertNotEmpty($visit['created_at']);

        $iri = $visit['@id'];
        self::assertSame('Boiterie', $this->get($iri)->toArray()['reason']);
        self::assertContains($iri, $this->collectionValues('/api/vet_visits', '@id'));

        self::assertSame(5000, $this->patch($iri, ['cost_cents' => 5000])->toArray()['cost_cents']);

        $this->delete($iri);
        self::assertResponseStatusCodeSame(204);
    }

    public function testPatchCannotMoveVisitToAnotherDog(): void
    {
        $dog = $this->createDog();
        $iri = $this->createVisit($dog);

        $this->patch($iri, ['dog' => $this->createDog(['name' => 'Marcel'])]);

        self::assertResponseIsSuccessful();
        self::assertSame($dog, $this->get($iri)->toArray()['dog']);
    }

    public function testMissingDogIsRejected(): void
    {
        $this->post('/api/vet_visits', ['visited_at' => '2024-01-15', 'reason' => 'Boiterie']);

        self::assertResponseStatusCodeSame(422);
    }

    public function testNegativeCostIsRejected(): void
    {
        $this->post('/api/vet_visits', [
            'dog' => $this->createDog(),
            'visited_at' => '2024-01-15',
            'reason' => 'Boiterie',
            'cost_cents' => -1,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testFreeVisitIsAccepted(): void
    {
        $this->createVisit($this->createDog(), ['cost_cents' => 0]);

        self::assertResponseStatusCodeSame(201);
    }

    public function testFutureDateIsRejected(): void
    {
        $this->post('/api/vet_visits', [
            'dog' => $this->createDog(),
            'visited_at' => self::day('+2 days'),
            'reason' => 'Boiterie',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testDateBeforeBirthIsRejected(): void
    {
        $this->post('/api/vet_visits', [
            'dog' => $this->createDog(['birth_date' => '2022-03-14']),
            'visited_at' => '2022-03-13',
            'reason' => 'Boiterie',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testDeletingDogWithVisitReturnsConflict(): void
    {
        $dog = $this->createDog();
        $this->createVisit($dog);

        $this->delete($dog);

        self::assertResponseStatusCodeSame(409);
    }

    public function testCollectionSortAndFilters(): void
    {
        $dog = $this->createDog();
        $other_dog = $this->createDog(['name' => 'Marcel']);
        $this->createVisit($dog, ['visited_at' => '2024-01-01']);
        $this->createVisit($dog, ['visited_at' => '2024-03-01']);
        $this->createVisit($other_dog, ['visited_at' => '2024-02-01']);

        self::assertSame(
            ['2024-03-01', '2024-02-01', '2024-01-01'],
            $this->collectionValues('/api/vet_visits', 'visited_at'),
        );
        self::assertSame(
            ['2024-03-01', '2024-01-01'],
            $this->collectionValues('/api/vet_visits?dog='.$dog, 'visited_at'),
        );
        self::assertSame(
            ['2024-03-01', '2024-02-01'],
            $this->collectionValues('/api/vet_visits?visited_at[after]=2024-02-01', 'visited_at'),
        );
    }
}
