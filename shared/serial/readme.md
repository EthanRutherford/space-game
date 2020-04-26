# Serial - Our custom serializer

This folder contains the serialization and deserialization logic for
the game. Rather than use `JSON`, or even some other binary generic
serialization form we have handrolled our own, using a form specific to
the needs of the game.

This allows the message format to be far smaller, avoiding the need
to encode the schema into the message itself. Instead, the schema
is stored in application code. A single byte is (more than) enough to
determine which of the handful of message kinds we're looking at,
and decoding continues on with very little additional switching
beyond that.

## Comparison

I will use `JSON` as the baseline for comparison, primarily because
of both its popularity and the fact that it's built in to all
javascript engines natively (and presumeably, well optimized).

### Transmission sizes
In regards to total message byte size, a message from `serial` is typically
about 1/5 the size of the equivalent `JSON`. There are two main reasons for
this significant reduction:

The first, and most obvious, is that `JSON` encodes schema information
into each message. You pay a byte for each open and close brace and
bracket, a colon for every key-value in an object, a comma between
each item in an object or array, and a pair of quotes for every string,
which includes every key in an object. In addition, there's the length
of the key itself. A fairly sizable chunk of the message is spent on
metadata.

The second, and more substantial savings comes from the fact that
`JSON` is a string encoding, and the vast majority of `serial` messages
are comprised entirely of numerical data, and mostly floating point
numbers at that. These numbers are frequently not pretty either,
they're almost always complex decimals. `JSON` will often use as many as
*18 bytes* for a single number. In contrast, `serial` supports
multiple primitive number types, which are serialized to their respective
native sizes. In the case of `float`s, essentially all data is sent as 32bit
floating point numbers, which are only 4 bytes. Various sizes of signed and
unsigned integers are also available.

### Serialization/deserialization speeds
In addition to producing significanly smaller payloads, `serial` turns out
to be *much* faster than `JSON`. Testing on a relatively modern Intel
processor revealed serialization speeds of up to *20 times* faster than
the equivalent `JSON`.

I suspect that the source of this difference is much the same as for the savings
in message size. It stands to reason that a much longer output would also take
longer to create. Adding extra information to the output takes extra time,
and encoding all the metadata along with the real data doesn't come for free.

In addition, translating from numbers to strings is not exactly cheap either.
Converting a number to a string, or vice versa, takes a fairly lengthy algorithm
with a decent amount of branching. In comparison, conversion from one kind of
number to another is typically quite a lot faster.

Another thing that hurts the `JSON` serializer (and any other generic serializer),
is that we want a *subset* of the shape of our objects. The client doesn't need
us to send the shape of each body every time, or any of the rest of the
metadata or internal data. The only way to tell `JSON.stringify` we don't need
all of that is to create new objects with the bits we want (as well as
flattened and with smaller key names). This means extra allocations,
and extra GC work.

One last thing that `JSON` has against it is that it is a *generic* serializer.
There is additional cost for checking the dynamic types of objects and
for iterating over the key value pairs of objects. `serial` on the other
hand consists of unique methods for serializing and deserializing each type.
Assuming we don't write a bug and pass the wrong data in, our methods are
*always* called with the exact same types, which is very optimizer-friendly.
We also explicitly define the shape of the data, so there's no cost for
iterating over keys, the exact calls can be optimized directly to machine
instructions with little to no branching whatsoever.

## Other considered serializers
Of course, before deciding to write a custom serialzer, other serial formats
were considered. Three popular formats were investigated before the decision
was made to handroll. Up front, there was a pretty strong requirement for the
format to be binary. As noted above, our messages almost exclusively contain
numeric data, and anything but a binary format would be wasteful by default.

#### BSON
Bson is a binary format which purports to be "JSON, but binary". In fact, if
it weren't already obvious, the name literally stands for "Binary JSON". It was
designed to be the storage format for mongodb databases, which is a sentence that
should already be raising eyebrows.

While `BSON` *is* better at representing numbers in terms of numbers of bytes, the
design goals for the specification do not align with the needs of the game. In
particular, `BSON` has better numeric type handling mostly because it's important
for a database to accurately store information (in fact, they even support decimal
numbers, for financial use-cases).

`BSON` additionally places a lot of emphasis on "traversability". As the primary
use case of the format is for powering a database, the format has lots of metadata
to facilitate "scanning". That is, non-primitive datatypes encode their byte length
directly into the output to facilitate seeking within a document. For these and
other similar reasons, BSON does not frequently save a significant amount of
memory compared to JSON.

#### messagepack
`messagepack` is similar to `BSON` in that it sets out to be a more efficient form
of `JSON`. In comparison, however, `messagepack` is more directly focused on being
a transfer format first, rather than a storage format.

Unfortunately, `messagepack` is also designed to be close to a 1-1 mapping of `JSON`.
It suffers from the same issues of being generic. The schema is still encoded
in the output, it's just smaller than in `JSON`. It's also not nearly as fast
as `serial` ended up being, which is due to many of the same problems `JSON` has,
with the addition that `messagepack `tries to put numeric values in the smallest
number of bytes it can. This focus on extreme bit-packing leads to non-native
binary representations for numbers, which takes longer to serialize and deserialize.
The effort frequently isn't worth it either, as the majority of the data is floats
and `messagepack` can't shrink them without sacrificing precision. At best, the
ouput from `messagepack` was typically about 1/2 the size of equivalent `JSON`.
(compare that to `serial`'s 1/5).

#### protocol buffers
`protobuf` is a Google project which, given a schema definition, will generate
code for serializing and deserializing for you. They were primiarily removed
from consideration fairly early on because of complexity. Using `protobuf`
involves running a tool to generate code, and defining shapes in files.

Taking time to figure out all of these tools, figuring out what the output even
looks like and how to use it, and the fact that the serialization sizes don't seem
to be easily customizable were all high barriers to entry. Add to that a lack of
any documentation in javascript, and no clear official javascript implementation
to be found, we didn't even get around to testing this one.

`protobuf` might actually be a good idea down the road, especially if interop
with versions built in other languages becomes desireable.

-----------------------

Ultimately, `serial` was quite easy to write, and is quite simple. Being built
on top of built in, highly efficient typed array api makes serialization both
incredibly straightforward while also being highly efficient in both space and
processing time. The public API is similarly simple to use and understand:
pass in the the type and data to serialize, and out comes a byte array ready
to be sent over the wire. Deserialization is the same in reverse: pass in
the bytes, and out comes the deserialized object and type.
