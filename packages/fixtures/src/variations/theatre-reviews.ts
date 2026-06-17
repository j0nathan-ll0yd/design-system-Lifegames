import type { TheatreReviewsExport } from '@lifegames/portal-contract/schemas';
import { createTheatreReviewsFixture, createReview } from '../factories/theatre-reviews';
import { isoDate } from '../factories/helpers';

export const theatreReviewsVariations: Record<string, TheatreReviewsExport> = {
  baseline: createTheatreReviewsFixture(),

  empty: createTheatreReviewsFixture({
    reviews: [],
    totalReviews: 0,
  }),

  allGrades: (() => {
    const reviews = [
      createReview({
        title: "A Midsummer Night's Dream",
        slug: 'a-midsummer-nights-dream',
        rating: 'A+',
        ratingNumeric: 4.3,
        excerpt: 'A transcendent production that redefines the genre entirely.',
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Hamlet',
        slug: 'hamlet',
        rating: 'A',
        ratingNumeric: 4.0,
        excerpt: 'A commanding performance anchors this thoughtful modern staging.',
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Macbeth',
        slug: 'macbeth',
        rating: 'A-',
        ratingNumeric: 3.7,
        excerpt: 'Visually stunning with occasional pacing issues in Act III.',
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Romeo and Juliet',
        slug: 'romeo-and-juliet',
        rating: 'B+',
        ratingNumeric: 3.3,
        excerpt: 'Fresh choreography elevates familiar material.',
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Othello',
        slug: 'othello',
        rating: 'B',
        ratingNumeric: 3.0,
        excerpt: 'Solid ensemble work, but the leads lack chemistry.',
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'The Tempest',
        slug: 'the-tempest',
        rating: 'C',
        ratingNumeric: 2.0,
        excerpt: 'Ambitious staging undermined by muddled direction.',
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Titus Andronicus',
        slug: 'titus-andronicus',
        rating: 'D',
        ratingNumeric: 1.0,
        excerpt: 'Gratuitous staging adds nothing to the text.',
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'The Comedy of Errors',
        slug: 'the-comedy-of-errors',
        rating: 'F',
        ratingNumeric: 0.0,
        excerpt: 'A complete misfire on every level.',
        publishedAt: isoDate(),
      }),
    ];
    return createTheatreReviewsFixture({ reviews, totalReviews: reviews.length });
  })(),

  noImages: (() => {
    const reviews = [
      createReview({
        title: "Long Day's Journey Into Night",
        slug: 'long-days-journey',
        rating: 'A',
        ratingNumeric: 4.0,
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
        publishedAt: isoDate(),
      }),
      createReview({
        title: "Who's Afraid of Virginia Woolf?",
        slug: 'whos-afraid-of-virginia-woolf',
        rating: 'B+',
        ratingNumeric: 3.3,
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'A Streetcar Named Desire',
        slug: 'a-streetcar-named-desire',
        rating: 'B',
        ratingNumeric: 3.0,
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
        publishedAt: isoDate(),
      }),
    ];
    return createTheatreReviewsFixture({ reviews, totalReviews: reviews.length });
  })(),

  maxReviews: (() => {
    const titles = [
      'The Cherry Orchard',
      'Uncle Vanya',
      'Three Sisters',
      'The Seagull',
      'Pygmalion',
      'Arms and the Man',
      'Heartbreak House',
      'Major Barbara',
    ];
    const ratings = ['A+', 'A', 'A-', 'B+', 'B+', 'B', 'B-', 'C+'];
    const numerics = [4.3, 4.0, 3.7, 3.3, 3.3, 3.0, 2.7, 2.3];
    const reviews = titles.map((title, i) =>
      createReview({
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        rating: ratings[i],
        ratingNumeric: numerics[i],
        excerpt: `A compelling production of ${title} that rewards patient audiences.`,
        publishedAt: isoDate(),
      }),
    );
    return createTheatreReviewsFixture({ reviews, totalReviews: reviews.length });
  })(),

  // Maximally populated: max reviews, ALL nullable item fields set to non-null
  // values (rating, ratingNumeric, imageUrl, imageWidth, imageHeight), all grades
  // represented, longest realistic excerpts.
  full: (() => {
    const reviews = [
      createReview({
        title: "A Midsummer Night's Dream",
        slug: 'a-midsummer-nights-dream',
        url: 'https://coasttocoastreviews.com/reviews/a-midsummer-nights-dream',
        author: 'Eleanor Fairchild',
        rating: 'A+',
        ratingNumeric: 4.3,
        excerpt:
          'A transcendent production that redefines the genre entirely — the fairy sequences deploy aerial silk work that transforms the stage into a living dreamscape, while the mechanicals bring genuine wit.',
        imageUrl: 'https://coasttocoastreviews.com/images/a-midsummer-nights-dream.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Hamlet',
        slug: 'hamlet',
        url: 'https://coasttocoastreviews.com/reviews/hamlet',
        author: 'Marcus Chen-Ramirez',
        rating: 'A',
        ratingNumeric: 4.0,
        excerpt:
          'A commanding central performance anchors this thoughtful modern staging — the soliloquies are delivered with a conversational intimacy that makes the language feel immediate and urgent.',
        imageUrl: 'https://coasttocoastreviews.com/images/hamlet.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Macbeth',
        slug: 'macbeth',
        url: 'https://coasttocoastreviews.com/reviews/macbeth',
        author: 'Priya Vasquez-Okonkwo',
        rating: 'A-',
        ratingNumeric: 3.7,
        excerpt:
          'Visually stunning with occasional pacing issues in Act III — the lighting design creates an atmosphere of perpetual twilight that perfectly mirrors the moral descent of the protagonists.',
        imageUrl: 'https://coasttocoastreviews.com/images/macbeth.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Romeo and Juliet',
        slug: 'romeo-and-juliet',
        url: 'https://coasttocoastreviews.com/reviews/romeo-and-juliet',
        author: 'James Thornton-Park',
        rating: 'B+',
        ratingNumeric: 3.3,
        excerpt:
          'Fresh choreography elevates familiar material — the fight scenes are brutal and kinetic while the balcony sequence is reimagined as a fire escape encounter that grounds the romance.',
        imageUrl: 'https://coasttocoastreviews.com/images/romeo-and-juliet.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Othello',
        slug: 'othello',
        url: 'https://coasttocoastreviews.com/reviews/othello',
        author: 'Sophia Nakamura-Williams',
        rating: 'B',
        ratingNumeric: 3.0,
        excerpt:
          'Solid ensemble work but the leads lack chemistry in the crucial early scenes — Iago steals every moment he occupies, making the manipulation feel almost too easy.',
        imageUrl: 'https://coasttocoastreviews.com/images/othello.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'The Tempest',
        slug: 'the-tempest',
        url: 'https://coasttocoastreviews.com/reviews/the-tempest',
        author: 'Rafael Johansson-Adeyemi',
        rating: 'C',
        ratingNumeric: 2.0,
        excerpt:
          'Ambitious staging undermined by muddled direction — the projection mapping is technically impressive but distracts from the language rather than enhancing it.',
        imageUrl: 'https://coasttocoastreviews.com/images/the-tempest.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'Titus Andronicus',
        slug: 'titus-andronicus',
        url: 'https://coasttocoastreviews.com/reviews/titus-andronicus',
        author: 'Diane Kowalski-Huang',
        rating: 'D',
        ratingNumeric: 1.0,
        excerpt:
          'Gratuitous staging adds nothing to the text — the decision to lean into graphic violence without satirical framing makes the production feel exploitative rather than provocative.',
        imageUrl: 'https://coasttocoastreviews.com/images/titus-andronicus.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
      createReview({
        title: 'The Comedy of Errors',
        slug: 'the-comedy-of-errors',
        url: 'https://coasttocoastreviews.com/reviews/the-comedy-of-errors',
        author: 'Benjamin Osei-Mensah',
        rating: 'F',
        ratingNumeric: 0.0,
        excerpt:
          'A complete misfire on every level — the slapstick timing is off, the doubling gimmick confuses rather than delights, and the musical interludes feel imported from a different production entirely.',
        imageUrl: 'https://coasttocoastreviews.com/images/the-comedy-of-errors.jpg',
        imageWidth: 1200,
        imageHeight: 675,
        publishedAt: isoDate(),
      }),
    ];
    return createTheatreReviewsFixture({ reviews, totalReviews: reviews.length });
  })(),
};
