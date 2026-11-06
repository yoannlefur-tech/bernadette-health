<?php

declare(strict_types=1);

namespace App\Tests\Api;

final class WeightEntryTest extends ApiResourceTestCase
{
    /** @return string IRI of the created weight entry */
    private function createEntry(string $dog, string $measured_at = '2024-01-15', int $weight_grams = 4200): string
    {
        $response = $this->post('/api/weight_entries', [
            'dog' => $dog,
            'measured_at' => $measured_at,
            'weight_grams' => $weight_grams,
        ]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['@id'];
    }

    public function testPostCreatesEntry(): void
    {
        $dog = $this->createDog();

        $response = $this->post('/api/weight_entries', [
            'dog' => $dog,
            'measured_at' => '2024-01-15',
            'weight_grams' => 4200,
        ]);

        self::assertResponseStatusCodeSame(201);
        $entry = $response->toArray();
        self::assertSame($dog, $entry['dog']);
        self::assertSame('2024-01-15', $entry['measured_at']);
        self::assertSame(4200, $entry['weight_grams']);
        self::assertNotEmpty($entry['created_at']);
    }

    public function testGetItemAndCollection(): void
    {
        $iri = $this->createEntry($this->createDog());

        self::assertSame(4200, $this->get($iri)->toArray()['weight_grams']);
        self::assertResponseIsSuccessful();
        self::assertContains($iri, $this->collectionValues('/api/weight_entries', '@id'));
    }

    public function testPatchUpdatesEntry(): void
    {
        $iri = $this->createEntry($this->createDog());

        $response = $this->patch($iri, ['weight_grams' => 4350]);

        self::assertResponseIsSuccessful();
        self::assertSame(4350, $response->toArray()['weight_grams']);
    }

    public function testPatchCannotMoveEntryToAnotherDog(): void
    {
        $dog = $this->createDog();
        $other_dog = $this->createDog(['name' => 'Marcel']);
        $iri = $this->createEntry($dog);

        $response = $this->patch($iri, ['dog' => $other_dog, 'weight_grams' => 4350]);

        self::assertResponseIsSuccessful();
        self::assertSame(4350, $response->toArray()['weight_grams']);
        self::assertSame($dog, $this->get($iri)->toArray()['dog']);
    }

    public function testDeleteRemovesEntry(): void
    {
        $iri = $this->createEntry($this->createDog());

        $this->delete($iri);

        self::assertResponseStatusCodeSame(204);
        $this->get($iri);
        self::assertResponseStatusCodeSame(404);
    }

    public function testDeletingDogWithEntriesReturnsConflict(): void
    {
        $dog = $this->createDog();
        $entry = $this->createEntry($dog);

        $response = $this->delete($dog);

        self::assertResponseStatusCodeSame(409);
        $body = $response->getContent(false);
        self::assertStringNotContainsString('SQLSTATE', $body);
        self::assertStringNotContainsString('DELETE FROM', $body);

        $this->get($dog);
        self::assertResponseIsSuccessful();
        $this->get($entry);
        self::assertResponseIsSuccessful();
    }

    public function testDogCanBeDeletedOnceItsEntriesAreGone(): void
    {
        $dog = $this->createDog();
        $entry = $this->createEntry($dog);

        $this->delete($entry);
        $this->delete($dog);

        self::assertResponseStatusCodeSame(204);
    }

    public function testNegativeWeightIsRejected(): void
    {
        $this->post('/api/weight_entries', [
            'dog' => $this->createDog(),
            'measured_at' => '2024-01-15',
            'weight_grams' => -100,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testZeroWeightIsRejected(): void
    {
        $this->post('/api/weight_entries', [
            'dog' => $this->createDog(),
            'measured_at' => '2024-01-15',
            'weight_grams' => 0,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testFloatWeightIsRejected(): void
    {
        $this->post('/api/weight_entries', [
            'dog' => $this->createDog(),
            'measured_at' => '2024-01-15',
            'weight_grams' => 4200.5,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testMissingDogIsRejected(): void
    {
        $this->post('/api/weight_entries', ['measured_at' => '2024-01-15', 'weight_grams' => 4200]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testFutureDateIsRejected(): void
    {
        $this->post('/api/weight_entries', [
            'dog' => $this->createDog(),
            'measured_at' => self::day('+2 days'),
            'weight_grams' => 4200,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testTodayIsAccepted(): void
    {
        $this->createEntry($this->createDog(), self::day('today'));

        self::assertResponseStatusCodeSame(201);
    }

    /**
     * The server runs in UTC: just after midnight in France, the local date is
     * already tomorrow for the server.
     */
    public function testTomorrowDateIsAccepted(): void
    {
        $this->createEntry($this->createDog(), self::day('tomorrow'));

        self::assertResponseStatusCodeSame(201);
    }

    public function testDayAfterTomorrowIsRejected(): void
    {
        $response = $this->post('/api/weight_entries', [
            'dog' => $this->createDog(),
            'measured_at' => self::day('+2 days'),
            'weight_grams' => 4200,
        ]);

        self::assertResponseStatusCodeSame(422);
        self::assertSame('measured_at', $response->toArray(false)['violations'][0]['propertyPath']);
    }

    public function testDateBeforeBirthIsRejected(): void
    {
        $this->post('/api/weight_entries', [
            'dog' => $this->createDog(['birth_date' => '2022-03-14']),
            'measured_at' => '2022-03-13',
            'weight_grams' => 4200,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testCollectionIsSortedByDateDescendingByDefault(): void
    {
        $dog = $this->createDog();
        $this->createEntry($dog, '2024-01-01');
        $this->createEntry($dog, '2024-03-01');
        $this->createEntry($dog, '2024-02-01');

        self::assertSame(
            ['2024-03-01', '2024-02-01', '2024-01-01'],
            $this->collectionValues('/api/weight_entries', 'measured_at'),
        );
        self::assertSame(
            ['2024-01-01', '2024-02-01', '2024-03-01'],
            $this->collectionValues('/api/weight_entries?order[measured_at]=asc', 'measured_at'),
        );
    }

    public function testCollectionIsFilteredByDate(): void
    {
        $dog = $this->createDog();
        $this->createEntry($dog, '2024-01-01');
        $this->createEntry($dog, '2024-02-01');
        $this->createEntry($dog, '2024-03-01');

        self::assertSame(
            ['2024-03-01', '2024-02-01'],
            $this->collectionValues('/api/weight_entries?measured_at[after]=2024-02-01', 'measured_at'),
        );
        self::assertSame(
            ['2024-02-01'],
            $this->collectionValues(
                '/api/weight_entries?measured_at[after]=2024-01-15&measured_at[before]=2024-02-15',
                'measured_at',
            ),
        );
    }

    public function testCollectionIsFilteredByDog(): void
    {
        $dog = $this->createDog();
        $other_dog = $this->createDog(['name' => 'Marcel']);
        $entry = $this->createEntry($dog);
        $this->createEntry($other_dog);

        self::assertSame([$entry], $this->collectionValues('/api/weight_entries?dog='.$dog, '@id'));
    }
}
