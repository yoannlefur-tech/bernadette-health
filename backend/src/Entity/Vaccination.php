<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\IriFilter;
use ApiPlatform\Doctrine\Orm\Filter\SortFilter;
use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\QueryParameter;
use App\Serializer\ApiDate;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Serializer\Attribute\Context;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(denormalizationContext: ['groups' => ['vaccination:write', 'vaccination:create']]),
        new Get(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['vaccination:read', 'timestampable:read']],
    denormalizationContext: ['groups' => ['vaccination:write']],
    order: ['administered_at' => 'DESC', 'id' => 'DESC'],
    parameters: [
        'dog' => new QueryParameter(filter: new IriFilter(), property: 'dog'),
        'administered_at' => new QueryParameter(filter: new DateFilter(), property: 'administered_at'),
        'next_due_at' => new QueryParameter(filter: new DateFilter(), property: 'next_due_at'),
        'order[administered_at]' => new QueryParameter(filter: new SortFilter(), property: 'administered_at'),
        'order[next_due_at]' => new QueryParameter(filter: new SortFilter(), property: 'next_due_at'),
    ],
)]
class Vaccination
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[ApiProperty(identifier: true)]
    #[Groups(['vaccination:read'])]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    #[ApiProperty(readableLink: false, writableLink: false)]
    #[Assert\NotNull]
    #[Groups(['vaccination:read', 'vaccination:create'])]
    private ?Dog $dog = null;

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 150)]
    #[Groups(['vaccination:read', 'vaccination:write'])]
    private ?string $name = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    #[Assert\NotNull]
    #[Assert\LessThanOrEqual(ApiDate::LATEST_PAST)]
    #[Assert\Expression(
        'value === null or this.getDog() === null or value >= this.getDog().getBirthDate()',
        message: 'This date cannot be before the birth date of the dog.',
    )]
    #[Context(normalizationContext: ApiDate::NORMALIZATION, denormalizationContext: ApiDate::DENORMALIZATION)]
    #[Groups(['vaccination:read', 'vaccination:write'])]
    private ?\DateTimeImmutable $administered_at = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    #[Assert\Expression(
        'value === null or this.getAdministeredAt() === null or value > this.getAdministeredAt()',
        message: 'The next due date must be after the administration date.',
    )]
    #[Context(normalizationContext: ApiDate::NORMALIZATION, denormalizationContext: ApiDate::DENORMALIZATION)]
    #[Groups(['vaccination:read', 'vaccination:write'])]
    private ?\DateTimeImmutable $next_due_at = null;

    #[ORM\Column(length: 150, nullable: true)]
    #[Assert\Length(max: 150)]
    #[Groups(['vaccination:read', 'vaccination:write'])]
    private ?string $veterinarian = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['vaccination:read', 'vaccination:write'])]
    private ?string $notes = null;

    public function __construct()
    {
        $this->id = Uuid::v7();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getDog(): ?Dog
    {
        return $this->dog;
    }

    public function setDog(?Dog $dog): static
    {
        $this->dog = $dog;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getAdministeredAt(): ?\DateTimeImmutable
    {
        return $this->administered_at;
    }

    public function setAdministeredAt(?\DateTimeImmutable $administered_at): static
    {
        $this->administered_at = $administered_at;

        return $this;
    }

    public function getNextDueAt(): ?\DateTimeImmutable
    {
        return $this->next_due_at;
    }

    public function setNextDueAt(?\DateTimeImmutable $next_due_at): static
    {
        $this->next_due_at = $next_due_at;

        return $this;
    }

    public function getVeterinarian(): ?string
    {
        return $this->veterinarian;
    }

    public function setVeterinarian(?string $veterinarian): static
    {
        $this->veterinarian = $veterinarian;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }
}
