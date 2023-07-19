import rentalsService from "../../src/services/rentals-service";
import rentalsRepository from "../../src/repositories/rentals-repository";
import { notFoundError } from "../../src/errors/notfound-error";

describe("Rentals Service Unit Tests", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  })

  it("should return rentals", async () => {
    jest.spyOn(rentalsRepository, "getRentals").mockResolvedValueOnce([
      { id: 1, closed:false, date: new Date(), endDate: new Date(), userId:1 },
      { id: 2, closed:false, date: new Date(), endDate: new Date(), userId:2 }
    ])

    const rentals = await rentalsService.getRentals();
    expect(rentals).toHaveLength(2);
  })

  it("should return rentals by rentalId", async () => {
    const rentalId = 9
    const mockRental = { 
      id: 1, 
      closed: false, 
      date: new Date(), 
      endDate: new Date(), 
      userId:1, 
      movies: [
        {
          id: 1,
          name: "Sooby Doo",
          adultsOnly: false,
          rentalId: 1
        }
      ]
    }

    jest.spyOn(rentalsRepository, "getRentalById").mockResolvedValueOnce(mockRental);

    const rental = await rentalsService.getRentalById(rentalId);

    expect(rentalsRepository.getRentalById).toHaveBeenCalledWith(rentalId);
    expect(rental).toEqual(mockRental);
  });

})