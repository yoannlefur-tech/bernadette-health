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
        new Post(denormalizationContext: ['groups' => ['vet_visit:write', 'vet_visit:create']]),
        new Get(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['vet_visit:read', 'timestampable:read']],
    denormalizationContext: ['groups' => ['vet_visit:write']],
    order: ['visited_at' => 'DESC', 'id' => 'DESC'],
    parameters: [
        'dog' => new QueryParameter(filter: new IriFilter(), property: 'dog'),
        'visited_at' => new QueryParameter(filter: new DateFilter(), property: 'visited_at'),
        'order[visited_at]' => new QueryParameter(filter: new SortFilter(), property: 'visited_at'),
    ],
)]
class VetVisit implements DogRecordInterface
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[ApiProperty(identifier: true)]
    #[Groups(['vet_visit:read'])]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    #[ApiProperty(readableLink: false, writableLink: false)]
    #[Assert\NotNull]
    #[Groups(['vet_visit:read', 'vet_visit:create'])]
    private ?Dog $dog = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    #[Assert\NotNull]
    #[Assert\LessThanOrEqual(ApiDate::LATEST_PAST)]
    #[Assert\Expression(
        'value === null or this.getDog() === null or value >= this.getDog().getBirthDate()',
        message: 'This date cannot be before the birth date of the dog.',
    )]
    #[ApiProperty(schema: ApiDate::SCHEMA)]
    #[Context(normalizationContext: ApiDate::NORMALIZATION, denormalizationContext: ApiDate::DENORMALIZATION)]
    #[Groups(['vet_visit:read', 'vet_visit:write'])]
    private ?\DateTimeImmutable $visited_at = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['vet_visit:read', 'vet_visit:write'])]
    private ?string $reason = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['vet_visit:read', 'vet_visit:write'])]
    private ?string $diagnosis = null;

    #[ORM\Column(nullable: true)]
    #[Assert\PositiveOrZero]
    #[Groups(['vet_visit:read', 'vet_visit:write'])]
    private ?int $cost_cents = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['vet_visit:read', 'vet_visit:write'])]
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

    public function getVisitedAt(): ?\DateTimeImmutable
    {
        return $this->visited_at;
    }

    public function setVisitedAt(?\DateTimeImmutable $visited_at): static
    {
        $this->visited_at = $visited_at;

        return $this;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): static
    {
        $this->reason = $reason;

        return $this;
    }

    public function getDiagnosis(): ?string
    {
        return $this->diagnosis;
    }

    public function setDiagnosis(?string $diagnosis): static
    {
        $this->diagnosis = $diagnosis;

        return $this;
    }

    public function getCostCents(): ?int
    {
        return $this->cost_cents;
    }

    public function setCostCents(?int $cost_cents): static
    {
        $this->cost_cents = $cost_cents;

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
