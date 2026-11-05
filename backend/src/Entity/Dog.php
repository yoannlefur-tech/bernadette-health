<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
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
use App\State\DogCreateProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Serializer\Attribute\Context;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[UniqueEntity(fields: ['microchip_number'])]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Post(processor: DogCreateProcessor::class),
        new Get(),
        new Patch(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['dog:read', 'timestampable:read']],
    denormalizationContext: ['groups' => ['dog:write']],
    order: ['birth_date' => 'DESC', 'id' => 'DESC'],
    parameters: [
        'birth_date' => new QueryParameter(filter: new DateFilter(), property: 'birth_date'),
        'order[birth_date]' => new QueryParameter(filter: new SortFilter(), property: 'birth_date'),
    ],
)]
class Dog
{
    use TimestampableTrait;

    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME)]
    #[ApiProperty(identifier: true)]
    #[Groups(['dog:read'])]
    private Uuid $id;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    #[Groups(['dog:read', 'dog:write'])]
    private ?string $name = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    #[Assert\NotNull]
    #[Assert\LessThanOrEqual(ApiDate::LATEST_PAST)]
    #[ApiProperty(schema: ApiDate::SCHEMA)]
    #[Context(normalizationContext: ApiDate::NORMALIZATION, denormalizationContext: ApiDate::DENORMALIZATION)]
    #[Groups(['dog:read', 'dog:write'])]
    private ?\DateTimeImmutable $birth_date = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    #[Groups(['dog:read', 'dog:write'])]
    private ?string $breed = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 100)]
    #[Groups(['dog:read', 'dog:write'])]
    private ?string $coat = null;

    #[ORM\Column(length: 32, nullable: true, unique: true)]
    #[Assert\NotBlank(allowNull: true)]
    #[Assert\Length(max: 32)]
    #[Groups(['dog:read', 'dog:write'])]
    private ?string $microchip_number = null;

    /**
     * In no serialization group: owners are neither readable nor writable
     * through the API.
     *
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class)]
    #[ORM\JoinTable(name: 'dog_owner')]
    private Collection $owners;

    public function __construct()
    {
        $this->id = Uuid::v7();
        $this->owners = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
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

    public function getBirthDate(): ?\DateTimeImmutable
    {
        return $this->birth_date;
    }

    public function setBirthDate(?\DateTimeImmutable $birth_date): static
    {
        $this->birth_date = $birth_date;

        return $this;
    }

    public function getBreed(): ?string
    {
        return $this->breed;
    }

    public function setBreed(?string $breed): static
    {
        $this->breed = $breed;

        return $this;
    }

    public function getCoat(): ?string
    {
        return $this->coat;
    }

    public function setCoat(?string $coat): static
    {
        $this->coat = $coat;

        return $this;
    }

    public function getMicrochipNumber(): ?string
    {
        return $this->microchip_number;
    }

    public function setMicrochipNumber(?string $microchip_number): static
    {
        $this->microchip_number = $microchip_number;

        return $this;
    }

    /** @return Collection<int, User> */
    public function getOwners(): Collection
    {
        return $this->owners;
    }

    public function addOwner(User $owner): static
    {
        if (!$this->owners->contains($owner)) {
            $this->owners->add($owner);
        }

        return $this;
    }
}
