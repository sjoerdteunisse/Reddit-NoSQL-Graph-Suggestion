class Error{
    constructor(errorName, errorStatus){
        this.errorName = errorName;
        this.errorStatus = errorStatus;
        this.timeStamp = new Date();
    }
}

module.exports = Error;