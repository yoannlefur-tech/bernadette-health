<?php

declare(strict_types=1);

namespace App\Tests\Api;

use ApiPlatform\Test\ApiTestCase;
use ApiPlatform\Test\Client;
use ApiPlatform\Test\Response;
use App\Entity\Dog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Uid\Uuid;

abstract class ApiResourceTestCase extends ApiTestCase
{
    protected static ?bool $alwaysBootKernel = false;

    protected const PASSWORD = 'correct horse battery staple';

    protected Client $client;

    /** The user the requests are sent as, unless the test changes it. */
    protected User $user;

    private ?string $token = null;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->user = $this->createUser('current-user@example.com');
        $this->actingAs($this->user);
    }

    protected function createUser(string $email = 'owner@example.com'): User
    {
        $container = static::getContainer();
        $user = (new User())->setEmail($email);
        $user->setPassword($container->get(UserPasswordHasherInterface::class)->hashPassword($user, self::PASSWORD));

        $entity_manager = $container->get(EntityManagerInterface::class);
        $entity_manager->persist($user);
        $entity_manager->flush();

        return $user;
    }

    /** There is no endpoint to add an owner for now. */
    protected function addOwnerInDatabase(string $dog_iri, User $owner): void
    {
        $entity_manager = static::getContainer()->get(EntityManagerInterface::class);
        $dog = $entity_manager->find(Dog::class, Uuid::fromString(basename($dog_iri)));
        $dog->addOwner($entity_manager->find(User::class, $owner->getId()));
        $entity_manager->flush();
        $entity_manager->clear();
    }

    /** Sends the next requests with a real token signed for this user. */
    protected function actingAs(User $user): void
    {
        $this->token = static::getContainer()->get(JWTTokenManagerInterface::class)->create($user);
    }

    /** Sends the next requests without any token. */
    protected function actingAsAnonymous(): void
    {
        $this->token = null;
    }

    /**
     * @param array<string, string> $headers
     *
     * @return array<string, string>
     */
    private function withToken(array $headers): array
    {
        return null === $this->token ? $headers : $headers + ['Authorization' => 'Bearer '.$this->token];
    }

    /** @param array<string, mixed> $body */
    protected function post(string $uri, array $body): Response
    {
        return $this->client->request('POST', $uri, [
            'headers' => $this->withToken(['Content-Type' => 'application/ld+json', 'Accept' => 'application/ld+json']),
            'json' => $body,
        ]);
    }

    /** @param array<string, mixed> $body */
    protected function patch(string $uri, array $body): Response
    {
        return $this->client->request('PATCH', $uri, [
            'headers' => $this->withToken(['Content-Type' => 'application/merge-patch+json', 'Accept' => 'application/ld+json']),
            'json' => $body,
        ]);
    }

    protected function get(string $uri): Response
    {
        return $this->client->request('GET', $uri, ['headers' => $this->withToken(['Accept' => 'application/ld+json'])]);
    }

    protected function delete(string $uri): Response
    {
        return $this->client->request('DELETE', $uri, ['headers' => $this->withToken(['Accept' => 'application/ld+json'])]);
    }

    /**
     * @param array<string, mixed> $overrides
     *
     * @return string IRI of the created dog
     */
    protected function createDog(array $overrides = []): string
    {
        $response = $this->post('/api/dogs', $overrides + [
            'name' => 'Bernadette',
            'birth_date' => '2022-03-14',
            'breed' => 'Teckel nain',
            'coat' => 'Poil ras, fauve',
        ]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['@id'];
    }

    /** @return list<string> values of $field for each item of a collection */
    protected function collectionValues(string $uri, string $field): array
    {
        $response = $this->get($uri);
        self::assertResponseIsSuccessful();

        return array_column($response->toArray()['member'], $field);
    }

    /** @return string a date relative to today, as sent to the API */
    protected static function day(string $modifier): string
    {
        return (new \DateTimeImmutable($modifier))->format('Y-m-d');
    }
}
