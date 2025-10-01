# Embedded Transformer Example

This example demonstrates how to use transformers on embedded columns in TypeORM.

## Use Case

You want to store an embedded object in the database as individual columns, but have it automatically converted to a class instance when loaded from the database.

## Example Code

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import { ValueTransformer } from "typeorm";

// Embedded class
class Address {
    street: string;
    city: string;
    zipCode: string;

    constructor(street?: string, city?: string, zipCode?: string) {
        this.street = street || "";
        this.city = city || "";
        this.zipCode = zipCode || "";
    }

    // Class method that only works on instances
    getFullAddress(): string {
        return `${this.street}, ${this.city} ${this.zipCode}`;
    }
}

// Transformer to convert plain object to Address class instance
const addressTransformer: ValueTransformer = {
    // Called when reading from database (plain object -> class instance)
    from(value: any): Address | null {
        if (!value) return null;
        return new Address(value.street, value.city, value.zipCode);
    },
    // Called when writing to database (class instance -> plain object)
    to(value: Address | null): any {
        if (!value) return null;
        return {
            street: value.street,
            city: value.city,
            zipCode: value.zipCode
        };
    }
};

@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    // Embedded column with transformer
    @Column(type => Address, {
        prefix: "addr",
        transformer: addressTransformer
    })
    address: Address;
}
```

## How It Works

**Before this change:**
- Individual columns within `Address` could have transformers
- But the `address` property itself was just a plain object
- You couldn't call `user.address.getFullAddress()` because `address` wasn't an `Address` instance

**After this change:**
- When loading from database: `transformer.from()` is called after all columns are populated
- The plain object `{ street: "...", city: "...", zipCode: "..." }` becomes an `Address` instance
- You can now call `user.address.getFullAddress()`
- When saving to database: `transformer.to()` is called before extracting column values

## Result

```typescript
const user = await userRepository.findOne(1);
// user.address is now an Address instance, not a plain object
console.log(user.address.getFullAddress()); // Works!
```

## Other Use Cases

1. **JSON parsing**: Transform JSON strings to typed objects
2. **Validation**: Validate embedded objects on load/save
3. **Encryption/Decryption**: Encrypt entire embedded objects
4. **Normalization**: Transform data formats (e.g., different date formats)
5. **Computed properties**: Add computed fields to embedded objects
