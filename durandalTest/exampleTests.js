define(['services/facilities', 'order/add'], function (facilityService, OrderAdd) {
    describe('OrderAddViewmodel', function () {

        var async = new AsyncSpec(this),
            sut;
        
        beforeEach(function() {
            sut = new OrderAdd();
        });

        async.it('isLoggedIn when cookie returns valid login token', function(done) {
            spyOn(cookie, 'get').andReturn({ sig: 1 });
            
            require(['services/login'], function (sut) {

                expect(sut.isLoggedIn()).toBe(true);
                done();
            });
        });
        
        async.it('activate gets facilities from service', function (done) {
            var facilities = [{ id: 1, name: 'guy' }, { id: 2, name: 'something' }];

            //This promise test works a bit differently than the ones below, since it returns the promise,
            //Instead of completing it internally. We can simply attach a .then() to the function call
            spyOn(facilityService, 'getFacilities').andCallFake(function () { return Q(facilities); });
            sut.activate().then(function() {
                expect(facilityService.getFacilities).toHaveBeenCalled();
                expect(sut.facilities()).toBe(facilities);
                done();
            });
        });
        
        async.it('changing facility gets units', function (done) {
            var facility = { id: 1 },
                units = [{ id: 1, name: 'guy' }, { id: 2, name: 'something' }];

            //GetUnits returns a promise that sets the units, so we need to run our expect()
            //calls after that happens. Attaching a .then() to the resulting promise is the easiest
            //way, since internally done() will already have been called, the tests .then()
            //Handler will happen on the next tick
            //If we tried to just run it synchronously after setting the facility, it would 
            //happen in the original tick, BEFORE the internal promise chained kicked off by the service call
            var promise = Q(units);
            spyOn(facilityService, 'getUnits').andCallFake(function () { return promise; });

            sut.selectedFacility(facility);
            
            promise.then(function () {
                expect(facilityService.getUnits).toHaveBeenCalledWith(1);
                expect(sut.units()).toBe(units);
                expect(sut.selectedUnit()).toBe(null);
                done();
            });
        });
        
        it('setting a null facility clears units', function () {
            //First, set the units to something so that we know the clear actually happens
            sut.units([1, 2]);

            spyOn(facilityService, 'getUnits').andCallFake(function () { return Q(); });

            //Facility starts out null, and knockout wont call subscribers if the value didn't change
            //So to test null, we first have to set another value
            sut.selectedFacility({ id: 1 });
            
            //Now clear it
            sut.selectedFacility(null);
            
            expect(sut.units().length).toBe(0);
        });
        
        async.it('changing unit gets jobtypes', function (done) {
            var unit = { id: 1 },
                profile = [{ jobTypes: [{ id: 1, name: 'guy' }, { id: 2, name: 'something' }] }];

            var promise = Q(profile);
            spyOn(facilityService, 'getUnitProfile').andCallFake(function () { return promise; });

            sut.selectedUnit(unit);

            promise.then(function () {
                expect(facilityService.getUnitProfile).toHaveBeenCalledWith(1);
                expect(sut.jobTypes()).toBe(profile.jobTypes);
                expect(sut.selectedJobType()).toBe(null);
                done();
            });
        });
        
        it('setting a null unit clears jobtypes', function () {
            sut.jobTypes([1, 2]);

            var profile = [{ jobTypes: [{ id: 1, name: 'guy' }, { id: 2, name: 'something' }] }];

            var promise = Q(profile);
            spyOn(facilityService, 'getUnitProfile').andCallFake(function () { return promise; });
            
            sut.selectedUnit({ id: 1 });
            sut.selectedUnit(null);
            
            expect(sut.jobTypes().length).toBe(0);
        });
        
        it('changing jobTypes sets specialties', function () {
            var jobType = { id: 1, specialties: [{ id: 1, name: 'guy' }, { id: 2, name: 'something' }] };
            
            sut.selectedJobType(jobType);
            
            expect(sut.specialties()).toBe(jobType.specialties);
            expect(sut.selectedSpecialty()).toBe(null);
        });
        
        it('setting a null job type clears specialties', function () {

            sut.selectedJobType({ id: 1, specialties: [{ id: 1, name: 'guy' }, { id: 2, name: 'something' }] });
            sut.selectedJobType(null);

            expect(sut.specialties().length).toBe(0);
        });
    });
});